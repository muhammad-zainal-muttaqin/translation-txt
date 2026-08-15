import type {
  DraftSettings,
  FileState,
  ChunkConfig,
  ActiveRun,
  ChunkRecord,
  ProviderConfig,
  ValidationIssue,
} from '../types';
import { callProvider } from './providers';
import { splitFileContent, mergeChunks } from './chunker';
import { buildTranslationPrompt } from './prompts';
import { sanitizeTranslationOutput, detectMetaCommentary } from './sanitize';
import * as validation from './validation';
import { saveActiveRun, generateRunId, addSessionLog } from './storage';

export interface TranslationProgress {
  currentChunk: number;
  totalChunks: number;
  percent: number;
  runningChunks: number[];
  completedChunks: number;
  etaSeconds: number | null;
}

export interface TranslationCallbacks {
  onRunUpdate?: (run: ActiveRun | null) => void;
  onChunkStart: (index: number) => void;
  onChunkComplete: (index: number, result: string) => void;
  onChunkError: (index: number, error: string) => void;
  onProgress: (progress: TranslationProgress) => void;
  onComplete: (output: string) => void;
  onError: (error: string) => void;
  onWaveStart?: (waveIndex: number, chunkIndices: number[]) => void;
  onWaveComplete?: (waveIndex: number) => void;
}

export interface TranslationConfig {
  file: FileState;
  draft: DraftSettings;
  abortSignal: AbortSignal;
}

const CHUNK_TIMEOUT_MS = 30 * 60 * 1000;
const WAVE_DELAY_MS = 500;
const MAX_RETRIES = 5;
const MAX_ATTEMPTS = MAX_RETRIES + 1;
const RETRY_BASE_DELAY_MS = 50;
const MAX_RETRY_DELAY_MS = 60 * 1000;

function buildProviderConfig(draft: DraftSettings): ProviderConfig {
  return {
    protocol: draft.providerProtocol,
    preset: null,
    endpointUrl: draft.endpointUrl,
    model: draft.model,
    apiKey: draft.apiKey,
    extraHeaders: draft.extraHeadersJson ? JSON.parse(draft.extraHeadersJson) : {},
    anthropicVersion: draft.anthropicVersion,
    maxOutputTokens: draft.maxOutputTokens,
  };
}

function errorProperty(error: unknown, key: string): unknown {
  if (!error || typeof error !== 'object') return undefined;
  return (error as Record<string, unknown>)[key];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'Unknown provider error');
}

function errorStatus(error: unknown): number | null {
  const status = errorProperty(error, 'status');
  if (typeof status === 'number') return status;
  if (typeof status === 'string' && /^\d{3}$/.test(status)) return Number(status);

  const match = errorMessage(error).match(/\b([45]\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function retryAfterMs(error: unknown): number | null {
  const direct = errorProperty(error, 'retryAfterMs');
  if (typeof direct === 'number' && Number.isFinite(direct)) return Math.max(0, direct);

  const seconds = errorProperty(error, 'retryAfter');
  if (typeof seconds === 'number' && Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const headerMatch = errorMessage(error).match(/retry-after\s*:\s*(\d+(?:\.\d+)?)/i);
  return headerMatch ? Math.max(0, Number(headerMatch[1]) * 1000) : null;
}

function isRateLimitError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 429) return true;
  return /429|rate limit|too many requests|rate_limit_exceeded|throttled/i.test(errorMessage(error));
}

function isPermanentProviderError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status !== null && [400, 401, 403, 404, 405, 422].includes(status)) return true;

  return /invalid config|invalid configuration|unknown protocol|invalid endpoint|model not found|model unavailable|unknown model|unsupported model|authentication failed|unauthorized|forbidden/i.test(
    errorMessage(error)
  );
}

function isRetryableProviderError(error: unknown): boolean {
  if (isPermanentProviderError(error)) return false;

  const status = errorStatus(error);
  if (status !== null) {
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
  }

  return /timeout|timed out|network|failed to fetch|fetch failed|econn|enotfound|socket|temporar|empty response|content blocked|refusal|server error|internal server|service unavailable|bad gateway|gateway timeout/i.test(
    errorMessage(error)
  );
}

function retryDelay(retryNumber: number, error?: unknown): number {
  const serverDelay = error ? retryAfterMs(error) : null;
  if (serverDelay !== null) return Math.min(MAX_RETRY_DELAY_MS, serverDelay);
  return Math.min(MAX_RETRY_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** Math.max(0, retryNumber - 1));
}

function waitForDelay(delayMs: number, abortSignal: AbortSignal): Promise<boolean> {
  if (abortSignal.aborted) return Promise.resolve(false);

  return new Promise(resolve => {
    let settled = false;
    let clearTimer = () => {};
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimer();
      abortSignal.removeEventListener('abort', onAbort);
      resolve(value);
    };
    const onAbort = () => finish(false);
    const timer = setTimeout(() => finish(true), delayMs);
    clearTimer = () => clearTimeout(timer);
    abortSignal.addEventListener('abort', onAbort, { once: true });
  });
}

function notifyRunUpdate(run: ActiveRun, callbacks: TranslationCallbacks): void {
  callbacks.onRunUpdate?.(run);
}

function getCompletedChunkCount(run: ActiveRun): number {
  return run.chunks.filter(chunk => chunk.status === 'success').length;
}

function updateRunProgress(
  run: ActiveRun,
  callbacks: TranslationCallbacks,
  runningChunks: number[],
  concurrency: number
): void {
  run.processedChunks = getCompletedChunkCount(run);

  const elapsedSeconds = run.startedAt
    ? Math.floor((Date.now() - run.startedAt) / 1000)
    : 0;
  const averageChunkTime = run.processedChunks > 0
    ? elapsedSeconds / run.processedChunks
    : null;
  const remainingChunks = Math.max(0, run.totalChunks - run.processedChunks);
  const etaSeconds = averageChunkTime === null
    ? null
    : Math.round((averageChunkTime * remainingChunks) / Math.max(1, concurrency));

  run.progress = {
    percent: Math.round((run.processedChunks / Math.max(run.totalChunks, 1)) * 100),
    elapsedSeconds,
    averageChunkTime,
    etaSeconds,
  };

  callbacks.onProgress({
    currentChunk: run.processedChunks,
    totalChunks: run.totalChunks,
    percent: run.progress.percent,
    runningChunks,
    completedChunks: run.processedChunks,
    etaSeconds,
  });
}

function persistRun(run: ActiveRun, callbacks: TranslationCallbacks): void {
  saveActiveRun(run);
  notifyRunUpdate(run, callbacks);
}

type ChunkResult =
  | { success: true; translatedText: string }
  | { success: false; error: string; aborted?: boolean };

type WaveOutcome = 'success' | 'paused' | 'failed';

interface WaveResult {
  outcome: WaveOutcome;
}

interface LeafResult {
  success: boolean;
  translatedText?: string;
  error?: string;
  aborted?: boolean;
  validationIssue?: ValidationIssue;
}

function fallbackValidateOutput(
  original: string,
  translated: string,
  format: string,
  finishReason: string | undefined,
  rawOutput: string
): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  if (!translated.trim()) {
    issues.push({ level: 'error', code: 'EMPTY_OUTPUT', message: 'The provider returned empty output.' });
  }
  if (finishReason && ['length', 'max_tokens'].includes(finishReason.toLowerCase())) {
    issues.push({ level: 'error', code: 'TRUNCATED_OUTPUT', message: 'The provider stopped at the output length limit.' });
  }
  if (/<\/?(?:think|thinking|reasoning)>|\[\/?thinking\]|\b(?:analysis|reasoning|thought process)\s*:/i.test(rawOutput)) {
    issues.push({ level: 'error', code: 'REASONING_LEAK', message: 'The output contains reasoning markers.' });
  }
  const meta = detectMetaCommentary(rawOutput);
  if (meta.flagged) {
    issues.push({ level: 'error', code: 'META_COMMENTARY', message: `The output contains task commentary: ${meta.markers.join(', ')}.` });
  }
  if (/cannot translate|unable to translate|refuse to translate|saya tidak bisa menerjemahkan/i.test(rawOutput)) {
    issues.push({ level: 'error', code: 'REFUSAL', message: 'The provider refused to translate the part.' });
  }
  if (/^\s*(?:here(?:'s| is)?|translation|terjemahan|berikut)[^\n:]*:\s*(?:\r?\n|$)/i.test(rawOutput)) {
    issues.push({ level: 'error', code: 'META_COMMENTARY', message: 'The output contains a preamble.' });
  }
  void original;
  void format;
  return { valid: !issues.length, issues };
}

function validateLeafOutput(
  original: string,
  translated: string,
  format: string,
  finishReason: string | undefined,
  rawOutput: string
): { valid: boolean; issues: ValidationIssue[] } {
  let validator: typeof validation.validateTranslationOutput | undefined;
  try {
    validator = validation.validateTranslationOutput;
  } catch {
    validator = undefined;
  }

  if (typeof validator === 'function') {
    try {
      return validator(original, translated, format, {
        rawOutput,
        finishReason,
      });
    } catch (error) {
      return {
        valid: false,
        issues: [{
          level: 'error',
          code: 'OUTPUT_VALIDATION_ERROR',
          message: errorMessage(error),
        }],
      };
    }
  }

  return fallbackValidateOutput(original, translated, format, finishReason, rawOutput);
}

function withChunkIndex(issue: ValidationIssue, chunkIndex: number): ValidationIssue {
  return { ...issue, chunkIndex };
}

function recordRetry(
  record: ChunkRecord,
  chunkIndex: number,
  retryNumber: number,
  reasonCode: string,
  reason: string
): void {
  record.retryCount = retryNumber;
  record.diagnostics.push({
    timestamp: Date.now(),
    type: 'warning',
    code: reasonCode,
    message: `Retry ${retryNumber}/${MAX_RETRIES}: ${reason}`,
  });
  addSessionLog(`Part ${chunkIndex + 1}: retry ${retryNumber}/${MAX_RETRIES} because ${reason}`, 'warning');
}

async function requestLeaf(
  run: ActiveRun,
  chunkIndex: number,
  source: string,
  format: string,
  chunkConfig: ChunkConfig,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  record: ChunkRecord,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<LeafResult> {
  let reinforceOutputContract = false;

  record.retryCount = 0;
  record.error = null;
  record.translatedCore = '';
  record.startTime = record.startTime || Date.now();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (abortSignal.aborted) {
      record.status = 'pending';
      record.startTime = null;
      record.endTime = null;
      notifyRunUpdate(run, callbacks);
      return { success: false, error: 'Aborted', aborted: true };
    }

    try {
      record.status = 'running';
      record.error = null;
      notifyRunUpdate(run, callbacks);
      callbacks.onChunkStart(chunkIndex);
      addSessionLog(`Part ${chunkIndex + 1}: API request ${attempt + 1}/${MAX_ATTEMPTS}`, 'info');

      const prompt = buildTranslationPrompt(source, format, {
        sourceLanguage: chunkConfig.sourceLanguage,
        targetLanguage: chunkConfig.targetLanguage,
        customInstruction: chunkConfig.instruction,
        useDefaultInstruction: draft.useDefaultInstruction,
      }, { reinforceOutputContract });

      const response = await callProvider(providerConfig, prompt, {
        signal: abortSignal,
        timeoutMs: CHUNK_TIMEOUT_MS,
      });

      if (abortSignal.aborted) {
        record.status = 'pending';
        record.startTime = null;
        record.endTime = null;
        notifyRunUpdate(run, callbacks);
        return { success: false, error: 'Aborted', aborted: true };
      }

      const rawOutput = typeof response?.content === 'string' ? response.content : '';
      const translatedText = sanitizeTranslationOutput(rawOutput, format);
      const outputValidation = validateLeafOutput(
        source,
        translatedText,
        format,
        response?.finishReason,
        rawOutput
      );

      if (outputValidation.valid) {
        record.status = 'success';
        record.translatedCore = translatedText;
        record.endTime = Date.now();
        record.error = null;
        notifyRunUpdate(run, callbacks);
        return { success: true, translatedText };
      }

      const validationIssue = withChunkIndex(
        outputValidation.issues.find(issue => issue.code === 'TRUNCATED_OUTPUT') ||
          outputValidation.issues.find(issue => issue.level === 'error') || {
          level: 'error',
          code: 'OUTPUT_INVALID',
          message: 'Output failed validation.',
        },
        chunkIndex
      );
      reinforceOutputContract = true;

      if (attempt < MAX_RETRIES) {
        const retryNumber = attempt + 1;
        recordRetry(record, chunkIndex, retryNumber, validationIssue.code, validationIssue.message);
        notifyRunUpdate(run, callbacks);
        const shouldContinue = await waitForDelay(retryDelay(retryNumber), abortSignal);
        if (!shouldContinue) {
          record.status = 'pending';
          record.startTime = null;
          record.endTime = null;
          notifyRunUpdate(run, callbacks);
          return { success: false, error: 'Aborted', aborted: true };
        }
        continue;
      }

      return {
        success: false,
        error: validationIssue.message,
        validationIssue,
      };
    } catch (error) {
      if (abortSignal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        record.status = 'pending';
        record.startTime = null;
        record.endTime = null;
        notifyRunUpdate(run, callbacks);
        return { success: false, error: 'Aborted', aborted: true };
      }

      const message = errorMessage(error);
      if (isRetryableProviderError(error) && attempt < MAX_RETRIES) {
        const retryNumber = attempt + 1;
        const delay = retryDelay(retryNumber, error);
        const reason = isRateLimitError(error)
          ? `rate limit, waiting ${delay}ms`
          : `${message}, waiting ${delay}ms`;
        recordRetry(record, chunkIndex, retryNumber, isRateLimitError(error) ? 'RATE_LIMIT' : 'RETRYABLE_PROVIDER_ERROR', reason);
        notifyRunUpdate(run, callbacks);
        const shouldContinue = await waitForDelay(delay, abortSignal);
        if (!shouldContinue) {
          record.status = 'pending';
          record.startTime = null;
          record.endTime = null;
          notifyRunUpdate(run, callbacks);
          return { success: false, error: 'Aborted', aborted: true };
        }
        continue;
      }

      return { success: false, error: message };
    }
  }

  return { success: false, error: 'Maximum retry attempts exceeded.' };
}

function createTemporaryChunk(index: number, original: string): ChunkRecord {
  return {
    index,
    original,
    translatedCore: '',
    status: 'pending',
    startTime: null,
    endTime: null,
    retryCount: 0,
    error: null,
    diagnostics: [],
    validationIssues: [],
  };
}

function canAdaptiveSplit(format: string): boolean {
  return format !== 'json' && format !== 'xml';
}

async function rescueTruncatedChunk(
  run: ActiveRun,
  chunkIndex: number,
  file: FileState,
  chunkConfig: ChunkConfig,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  record: ChunkRecord,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<LeafResult> {
  if (!canAdaptiveSplit(file.format)) {
    record.diagnostics.push({
      timestamp: Date.now(),
      type: 'error',
      code: 'ADAPTIVE_SUBSPLIT_UNAVAILABLE',
      message: `${file.format.toUpperCase()} cannot be split safely as text.`,
    });
    return {
      success: false,
      error: 'Truncated output cannot be safely split for this format.',
      validationIssue: {
        level: 'error',
        code: 'ADAPTIVE_SUBSPLIT_UNAVAILABLE',
        message: 'Truncated output cannot be safely split for this format.',
        chunkIndex,
      },
    };
  }

  const rescueMaxChars = Math.max(1000, Math.ceil(record.original.length / 2));
  const rescue = splitFileContent(record.original, file.format, {
    maxCharsPerChunk: rescueMaxChars,
    overlapLines: 0,
    autoSplit: false,
  });
  const subparts = rescue.chunks.filter(part => part.length > 0);

  if (subparts.length < 2) {
    record.diagnostics.push({
      timestamp: Date.now(),
      type: 'error',
      code: 'ADAPTIVE_SUBSPLIT_UNAVAILABLE',
      message: 'The existing splitter could not produce smaller safe subparts.',
    });
    return {
      success: false,
      error: 'The truncated part could not be split into safe subparts.',
      validationIssue: {
        level: 'error',
        code: 'ADAPTIVE_SUBSPLIT_UNAVAILABLE',
        message: 'The truncated part could not be split into safe subparts.',
        chunkIndex,
      },
    };
  }

  record.rescueCount = subparts.length;
  record.diagnostics.push({
    timestamp: Date.now(),
    type: 'info',
    code: 'ADAPTIVE_SUBSPLIT',
    message: `Truncation persisted after ${MAX_ATTEMPTS} requests; translating ${subparts.length} subparts sequentially.`,
  });

  const translatedSubparts: string[] = [];
  for (let index = 0; index < subparts.length; index++) {
    if (abortSignal.aborted) {
      return { success: false, error: 'Aborted', aborted: true };
    }

    const subpartRecord = createTemporaryChunk(index, subparts[index]);
    const result = await requestLeaf(
      run,
      chunkIndex,
      subparts[index],
      file.format,
      chunkConfig,
      draft,
      providerConfig,
      subpartRecord,
      callbacks,
      abortSignal
    );

    record.diagnostics.push(...subpartRecord.diagnostics.map(diagnostic => ({
      ...diagnostic,
      message: `Subpart ${index + 1}: ${diagnostic.message}`,
    })));

    if (!result.success) {
      record.diagnostics.push({
        timestamp: Date.now(),
        type: 'error',
        code: 'RESCUE_SUBPART_FAILED',
        message: `Subpart ${index + 1}/${subparts.length} failed: ${result.error || 'Unknown rescue error'}`,
      });
      return result;
    }

    translatedSubparts.push(result.translatedText || '');
  }

  const translatedText = mergeChunks(translatedSubparts, 0, file.format);
  const mergedValidation = validateLeafOutput(
    record.original,
    translatedText,
    file.format,
    undefined,
    translatedText
  );
  if (!mergedValidation.valid) {
    const validationIssue = withChunkIndex(
      mergedValidation.issues.find(issue => issue.level === 'error') || {
        level: 'error',
        code: 'RESCUED_OUTPUT_INVALID',
        message: 'The rescued output failed final part validation.',
      },
      chunkIndex
    );
    return { success: false, error: validationIssue.message, validationIssue };
  }

  return { success: true, translatedText };
}

async function runSingleChunk(
  run: ActiveRun,
  chunkIndex: number,
  file: FileState,
  chunkConfig: ChunkConfig,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<ChunkResult> {
  const chunkRecord = run.chunks[chunkIndex];
  chunkRecord.status = 'running';
  chunkRecord.translatedCore = '';
  chunkRecord.error = null;
  chunkRecord.retryCount = 0;
  chunkRecord.rescueCount = 0;
  chunkRecord.validationIssues = [];
  run.finalValidationIssues = (run.finalValidationIssues || []).filter(issue => issue.chunkIndex !== chunkIndex);

  const result = await requestLeaf(
    run,
    chunkIndex,
    chunkRecord.original,
    file.format,
    chunkConfig,
    draft,
    providerConfig,
    chunkRecord,
    callbacks,
    abortSignal
  );

  if (result.success) {
    chunkRecord.status = 'success';
    chunkRecord.translatedCore = result.translatedText || '';
    chunkRecord.endTime = Date.now();
    notifyRunUpdate(run, callbacks);
    callbacks.onChunkComplete(chunkIndex, chunkRecord.translatedCore);
    return { success: true, translatedText: chunkRecord.translatedCore };
  }

  if (result.aborted) {
    chunkRecord.status = 'pending';
    chunkRecord.startTime = null;
    chunkRecord.endTime = null;
    notifyRunUpdate(run, callbacks);
    return { success: false, error: 'Aborted', aborted: true };
  }

  if (result.validationIssue?.code === 'TRUNCATED_OUTPUT') {
    const rescueResult = await rescueTruncatedChunk(
      run,
      chunkIndex,
      file,
      chunkConfig,
      draft,
      providerConfig,
      chunkRecord,
      callbacks,
      abortSignal
    );
    if (rescueResult.success) {
      chunkRecord.status = 'success';
      chunkRecord.translatedCore = rescueResult.translatedText || '';
      chunkRecord.error = null;
      chunkRecord.endTime = Date.now();
      notifyRunUpdate(run, callbacks);
      callbacks.onChunkComplete(chunkIndex, chunkRecord.translatedCore);
      return { success: true, translatedText: chunkRecord.translatedCore };
    }
    if (rescueResult.aborted) {
      chunkRecord.status = 'pending';
      chunkRecord.startTime = null;
      chunkRecord.endTime = null;
      notifyRunUpdate(run, callbacks);
      return { success: false, error: 'Aborted', aborted: true };
    }
    result.validationIssue = rescueResult.validationIssue || result.validationIssue;
    result.error = rescueResult.error || 'Rescue failed.';
  }

  chunkRecord.status = result.validationIssue ? 'failed-validation' : 'failed';
  chunkRecord.error = result.error || 'Part failed.';
  chunkRecord.endTime = Date.now();
  if (result.validationIssue) {
    chunkRecord.validationIssues = [result.validationIssue];
    run.finalValidationIssues = [...(run.finalValidationIssues || []), result.validationIssue];
  }
  notifyRunUpdate(run, callbacks);
  callbacks.onChunkError(chunkIndex, chunkRecord.error);
  addSessionLog(`Part ${chunkIndex + 1}: failed validation or provider request: ${chunkRecord.error}`, 'error');
  return { success: false, error: chunkRecord.error };
}

async function runWave(
  run: ActiveRun,
  chunkIndices: number[],
  file: FileState,
  chunkConfig: ChunkConfig,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<WaveResult> {
  if (chunkIndices.length === 0) return { outcome: 'success' };

  const maxParallel = Math.max(1, chunkConfig.maxParallelChunks);
  const waveIndex = Math.floor(chunkIndices[0] / maxParallel) + 1;
  const totalWaves = Math.ceil(run.chunks.length / maxParallel);

  chunkIndices.forEach(index => {
    run.chunks[index].status = 'running';
    run.chunks[index].startTime = run.chunks[index].startTime || Date.now();
    run.chunks[index].error = null;
  });
  updateRunProgress(run, callbacks, chunkIndices, chunkIndices.length);
  notifyRunUpdate(run, callbacks);
  addSessionLog(`Wave ${waveIndex}/${totalWaves}: starting parts ${chunkIndices.map(i => i + 1).join(', ')}`, 'info');
  callbacks.onWaveStart?.(waveIndex, chunkIndices);

  const results = await Promise.allSettled(chunkIndices.map(index => runSingleChunk(
    run,
    index,
    file,
    chunkConfig,
    draft,
    providerConfig,
    callbacks,
    abortSignal
  )));

  let abortCount = 0;
  let failCount = 0;
  let successCount = 0;
  results.forEach((result, resultIndex) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) successCount++;
      else if (result.value.aborted) abortCount++;
      else failCount++;
    } else {
      failCount++;
      const index = chunkIndices[resultIndex];
      run.chunks[index].status = 'failed';
      run.chunks[index].error = errorMessage(result.reason);
      run.chunks[index].endTime = Date.now();
    }
  });

  updateRunProgress(run, callbacks, [], maxParallel);
  persistRun(run, callbacks);
  callbacks.onWaveComplete?.(waveIndex);
  addSessionLog(`Wave ${waveIndex}: ${successCount} success, ${failCount} failed, ${abortCount} aborted`, 'info');

  if (abortCount > 0 && failCount === 0) return { outcome: 'paused' };
  if (failCount > 0) return { outcome: 'failed' };
  return { outcome: 'success' };
}

function failRun(
  run: ActiveRun,
  callbacks: TranslationCallbacks,
  message: string,
  issue?: ValidationIssue
): void {
  run.status = 'failed';
  run.completedAt = null;
  if (issue && !(run.finalValidationIssues || []).some(existing =>
    existing.code === issue.code && existing.chunkIndex === issue.chunkIndex
  )) {
    run.finalValidationIssues = [...(run.finalValidationIssues || []), issue];
  }
  updateRunProgress(run, callbacks, [], 1);
  persistRun(run, callbacks);
  addSessionLog(`Translation failed: ${message}`, 'error');
  callbacks.onError(message);
}

async function runChunks(
  run: ActiveRun,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  startIndex: number,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<void> {
  const file = run.file;
  const chunkConfig = run.config;
  const totalChunks = run.chunks.length;
  const maxParallel = Math.max(1, chunkConfig.maxParallelChunks);
  const waves: number[][] = [];
  let currentWave: number[] = [];

  addSessionLog(`Starting translation with max ${maxParallel} parallel parts`, 'info');

  for (let index = startIndex; index < totalChunks; index++) {
    if (run.chunks[index].status === 'success') continue;
    currentWave.push(index);
    if (currentWave.length >= maxParallel) {
      waves.push([...currentWave]);
      currentWave = [];
    }
  }
  if (currentWave.length > 0) waves.push(currentWave);

  addSessionLog(`Created ${waves.length} waves for ${totalChunks - startIndex} remaining parts`, 'info');

  for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
    if (abortSignal.aborted) {
      run.status = 'paused';
      persistRun(run, callbacks);
      addSessionLog('Translation paused by user', 'warning');
      return;
    }

    const result = await runWave(
      run,
      waves[waveIndex],
      file,
      chunkConfig,
      draft,
      providerConfig,
      callbacks,
      abortSignal
    );

    if (result.outcome === 'paused') {
      run.status = 'paused';
      persistRun(run, callbacks);
      addSessionLog('Translation paused by user', 'warning');
      return;
    }

    if (result.outcome === 'failed') {
      const failedChunk = run.chunks.find(chunk => chunk.status !== 'success');
      failRun(run, callbacks, failedChunk?.error || 'A part failed.');
      return;
    }

    if (waveIndex < waves.length - 1) {
      const shouldContinue = await waitForDelay(WAVE_DELAY_MS, abortSignal);
      if (!shouldContinue) {
        run.status = 'paused';
        persistRun(run, callbacks);
        addSessionLog('Translation paused by user', 'warning');
        return;
      }
    }
  }

  const incompleteChunk = run.chunks.find(chunk => chunk.status !== 'success');
  if (incompleteChunk) {
    failRun(run, callbacks, incompleteChunk.error || 'Not all parts passed validation.');
    return;
  }

  const finalOutput = mergeChunks(
    run.chunks.map(chunk => chunk.translatedCore),
    chunkConfig.overlapLines,
    file.format
  );
  const finalValidation = validateLeafOutput(
    file.content,
    finalOutput,
    file.format,
    undefined,
    finalOutput
  );

  if (!finalValidation.valid) {
    const finalIssue = finalValidation.issues.find(issue => issue.level === 'error') || {
      level: 'error' as const,
      code: 'FINAL_VALIDATION_FAILED',
      message: 'The merged translation failed final validation.',
    };
    run.finalValidationIssues = finalValidation.issues;
    failRun(run, callbacks, finalIssue.message, finalIssue);
    return;
  }

  run.finalValidationIssues = finalValidation.issues;
  run.status = 'completed';
  run.completedAt = Date.now();
  updateRunProgress(run, callbacks, [], 1);
  run.progress.percent = 100;
  run.progress.etaSeconds = 0;
  persistRun(run, callbacks);
  addSessionLog('Translation completed after all parts passed validation', 'info');
  callbacks.onComplete(finalOutput);
}

function providerValidationError(draft: DraftSettings): string | null {
  const result = validation.validateProviderConfig({
    endpointUrl: draft.endpointUrl,
    model: draft.model,
    apiKey: draft.apiKey,
    extraHeadersJson: draft.extraHeadersJson,
  });
  return result.valid ? null : result.issues.map(item => item.message).join('; ');
}

export async function startTranslation(
  config: TranslationConfig,
  callbacks: TranslationCallbacks
): Promise<void> {
  const { file, draft, abortSignal } = config;
  addSessionLog('Starting translation process...', 'info');

  const fileValidation = validation.validateFile(file);
  if (!fileValidation.valid) {
    const errorMsg = fileValidation.issues.map(item => item.message).join('; ');
    addSessionLog(`File validation failed: ${errorMsg}`, 'error');
    callbacks.onError(errorMsg);
    return;
  }

  const providerError = providerValidationError(draft);
  if (providerError) {
    addSessionLog(`Provider validation failed: ${providerError}`, 'error');
    callbacks.onError(providerError);
    return;
  }

  let providerConfig: ProviderConfig;
  try {
    providerConfig = buildProviderConfig(draft);
  } catch (error) {
    const message = `Provider configuration is invalid: ${errorMessage(error)}`;
    addSessionLog(message, 'error');
    callbacks.onError(message);
    return;
  }

  const baseParallel = draft.maxParallelChunks || 3;
  const multiplier = draft.parallelMultiplier || 1;
  const actualMaxParallel = Math.max(1, Math.min(100, baseParallel * multiplier));
  addSessionLog(`[Diagnostic] Chunk timeout: ${CHUNK_TIMEOUT_MS / 1000}s, Effective parallel parts: ${actualMaxParallel}, retries per part: ${MAX_RETRIES}`, 'info');

  const chunkConfig: ChunkConfig = {
    sourceLanguage: draft.sourceLanguage === 'custom' ? draft.sourceLanguageCustom : draft.sourceLanguage,
    targetLanguage: draft.targetLanguage === 'custom' ? draft.targetLanguageCustom : draft.targetLanguage,
    instruction: draft.useDefaultInstruction ? '' : draft.customInstruction,
    novelModeEnabled: draft.novelModeEnabled,
    refusalRecoveryEnabled: draft.refusalRecoveryEnabled,
    maxCharsPerChunk: draft.maxCharsPerChunk,
    overlapLines: draft.overlapLines,
    maxParallelChunks: actualMaxParallel,
    parallelMultiplier: multiplier,
    autoSplit: draft.autoSplit,
  };

  const { chunks: originalChunks } = splitFileContent(file.content, file.format, {
    maxCharsPerChunk: chunkConfig.maxCharsPerChunk,
    overlapLines: chunkConfig.overlapLines,
    autoSplit: chunkConfig.autoSplit,
  });
  addSessionLog(`Split into ${originalChunks.length} parts`, 'info');

  const chunkRecords: ChunkRecord[] = originalChunks.map((original, index) => createTemporaryChunk(index, original));
  const run: ActiveRun = {
    id: generateRunId(),
    status: 'running',
    file,
    config: chunkConfig,
    chunks: chunkRecords,
    createdAt: Date.now(),
    startedAt: Date.now(),
    completedAt: null,
    totalChunks: originalChunks.length,
    processedChunks: 0,
    finalValidationIssues: [],
    novelContext: null,
    progress: {
      percent: 0,
      elapsedSeconds: 0,
      averageChunkTime: null,
      etaSeconds: null,
    },
  };

  saveActiveRun(run);
  await runChunks(run, draft, providerConfig, 0, callbacks, abortSignal);
}

export interface ResumeTranslationConfig {
  run: ActiveRun;
  draft: DraftSettings;
  abortSignal: AbortSignal;
}

export async function resumeTranslation(
  config: ResumeTranslationConfig,
  callbacks: TranslationCallbacks
): Promise<void> {
  const { run, draft, abortSignal } = config;
  addSessionLog('Resuming translation...', 'info');

  const providerError = providerValidationError(draft);
  if (providerError) {
    addSessionLog(`Provider validation failed: ${providerError}`, 'error');
    callbacks.onError(providerError);
    return;
  }

  let providerConfig: ProviderConfig;
  try {
    providerConfig = buildProviderConfig(draft);
  } catch (error) {
    const message = `Provider configuration is invalid: ${errorMessage(error)}`;
    addSessionLog(message, 'error');
    callbacks.onError(message);
    return;
  }

  const baseParallel = draft.maxParallelChunks || 3;
  const multiplier = draft.parallelMultiplier || 1;
  const effectiveParallel = Math.max(1, Math.min(100, baseParallel * multiplier));
  run.config = { ...run.config, maxParallelChunks: effectiveParallel, parallelMultiplier: multiplier };
  addSessionLog(`[Diagnostic] Chunk timeout: ${CHUNK_TIMEOUT_MS / 1000}s, Effective parallel parts: ${effectiveParallel}, retries per part: ${MAX_RETRIES}`, 'info');

  const firstUnfinished = run.chunks.findIndex(chunk => chunk.status !== 'success');
  const startIndex = firstUnfinished === -1 ? run.chunks.length : firstUnfinished;
  run.status = 'running';
  if (!run.startedAt) run.startedAt = Date.now();
  saveActiveRun(run);
  await runChunks(run, draft, providerConfig, startIndex, callbacks, abortSignal);
}

export function pauseTranslation(): void {
  addSessionLog('Translation pause requested', 'info');
}

export function cancelTranslation(): void {
  addSessionLog('Translation cancelled', 'info');
}

export function discardActiveRun(): void {
  saveActiveRun(null);
  addSessionLog('Active run discarded', 'info');
}
