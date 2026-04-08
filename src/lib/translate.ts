import type {
  DraftSettings,
  FileState,
  ChunkConfig,
  ActiveRun,
  ChunkRecord,
  ProviderConfig,
} from '../types';
import { callProvider } from './providers';
import { splitFileContent, mergeChunks } from './chunker';
import { buildTranslationPrompt } from './prompts';
import { validateFile, validateProviderConfig } from './validation';
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

// Chunk timeout: 10 minutes per chunk (karena 1 chunk bisa 8 menit)
const CHUNK_TIMEOUT_MS = 10 * 60 * 1000;
// Delay antar wave untuk menghindari rate limit
const WAVE_DELAY_MS = 500;
// Retry delay saat rate limit
const RATE_LIMIT_RETRY_DELAY_MS = 2000;

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

// Check if error is rate limit
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('rate_limit_exceeded') ||
      msg.includes('throttled')
    );
  }
  return false;
}

// Run single chunk with timeout and retry logic
async function runSingleChunk(
  chunkIndex: number,
  chunkRecord: ChunkRecord,
  file: FileState,
  chunkConfig: ChunkConfig,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<{ success: boolean; translatedText?: string; error?: string }> {
  
  const maxRetries = draft.refusalRecoveryEnabled ? 2 : 0;
  let attempt = 0;

  while (attempt <= maxRetries) {
    if (abortSignal.aborted) {
      return { success: false, error: 'Aborted' };
    }

    try {
      chunkRecord.status = 'running';
      chunkRecord.startTime = Date.now();
      
      callbacks.onChunkStart(chunkIndex);
      addSessionLog(`Chunk ${chunkIndex + 1}: API call started (attempt ${attempt + 1})`, 'info');

      const prompt = buildTranslationPrompt(chunkRecord.original, file.format, {
        sourceLanguage: chunkConfig.sourceLanguage,
        targetLanguage: chunkConfig.targetLanguage,
        customInstruction: chunkConfig.instruction,
        useDefaultInstruction: draft.useDefaultInstruction,
      });

      // Race between API call and timeout
      const response = await Promise.race([
        callProvider(providerConfig, prompt, { signal: abortSignal }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Chunk timeout')), CHUNK_TIMEOUT_MS);
        }),
      ]);

      if (abortSignal.aborted) {
        chunkRecord.status = 'pending';
        chunkRecord.startTime = null;
        return { success: false, error: 'Aborted' };
      }

      const translatedText = response.content.trim();

      if (response.finishReason === 'length') {
        chunkRecord.status = 'truncated';
        chunkRecord.error = 'Output was truncated due to length limits.';
        chunkRecord.translatedCore = translatedText;
        chunkRecord.endTime = Date.now();
        addSessionLog(`Chunk ${chunkIndex + 1}: truncated`, 'warning');
        callbacks.onChunkError(chunkIndex, chunkRecord.error);
        return { success: true, translatedText };
      } else {
        chunkRecord.status = 'success';
        chunkRecord.translatedCore = translatedText;
        chunkRecord.endTime = Date.now();
        addSessionLog(`Chunk ${chunkIndex + 1}: completed in ${((chunkRecord.endTime - chunkRecord.startTime) / 1000).toFixed(1)}s`, 'info');
        callbacks.onChunkComplete(chunkIndex, translatedText);
        return { success: true, translatedText };
      }

    } catch (error) {
      // Handle abort
      if (abortSignal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        chunkRecord.status = 'pending';
        chunkRecord.startTime = null;
        return { success: false, error: 'Aborted' };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a timeout
      if (errorMessage.includes('timeout')) {
        addSessionLog(`Chunk ${chunkIndex + 1}: timeout after ${CHUNK_TIMEOUT_MS / 1000}s`, 'error');
      }

      // Check if it's rate limit
      if (isRateLimitError(error) && attempt < maxRetries) {
        attempt++;
        addSessionLog(`Chunk ${chunkIndex + 1}: rate limited, waiting ${RATE_LIMIT_RETRY_DELAY_MS}ms before retry ${attempt}/${maxRetries}`, 'warning');
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
        continue;
      }

      // Fatal error
      chunkRecord.status = 'failed';
      chunkRecord.error = errorMessage;
      chunkRecord.endTime = Date.now();
      chunkRecord.retryCount = attempt;

      addSessionLog(`Chunk ${chunkIndex + 1}: failed - ${errorMessage}`, 'error');
      callbacks.onChunkError(chunkIndex, errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// Run a wave of chunks in parallel
async function runWave(
  run: ActiveRun,
  chunkIndices: number[],
  file: FileState,
  chunkConfig: ChunkConfig,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<{ success: boolean; fallbackToSequential?: boolean }> {
  
  if (chunkIndices.length === 0) return { success: true };

  const waveIndex = Math.floor(chunkIndices[0] / chunkConfig.maxParallelChunks) + 1;
  const totalWaves = Math.ceil(run.chunks.length / chunkConfig.maxParallelChunks);
  
  addSessionLog(`Wave ${waveIndex}/${totalWaves}: Starting chunks ${chunkIndices.map(i => i + 1).join(', ')}`, 'info');
  callbacks.onWaveStart?.(waveIndex, chunkIndices);

  // Mark all chunks as running
  chunkIndices.forEach(idx => {
    run.chunks[idx].status = 'running';
    run.chunks[idx].startTime = Date.now();
  });
  saveActiveRun(run);

  // Execute all chunks in parallel
  const promises = chunkIndices.map(idx =>
    runSingleChunk(
      idx,
      run.chunks[idx],
      file,
      chunkConfig,
      draft,
      providerConfig,
      callbacks,
      abortSignal
    )
  );

  const results = await Promise.allSettled(promises);

  // Check results
  let rateLimitCount = 0;
  let abortCount = 0;
  let successCount = 0;
  let failCount = 0;

  results.forEach((result, idx) => {
    const chunkIdx = chunkIndices[idx];
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        successCount++;
      } else if (result.value.error === 'Aborted') {
        abortCount++;
      } else {
        failCount++;
        // Check if error was rate limit
        if (result.value.error && isRateLimitError(new Error(result.value.error))) {
          rateLimitCount++;
        }
      }
    } else {
      failCount++;
    }
  });

  // Update progress
  run.processedChunks = run.chunks.filter(
    c => c.status === 'success' || c.status === 'truncated'
  ).length;
  
  const elapsed = Math.floor((Date.now() - run.startedAt!) / 1000);
  const avgChunkTime = elapsed / Math.max(run.processedChunks, 1);
  const remaining = run.totalChunks - run.processedChunks;
  const etaSeconds = Math.round(avgChunkTime * remaining / chunkConfig.maxParallelChunks);

  run.progress = {
    percent: Math.round((run.processedChunks / run.totalChunks) * 100),
    elapsedSeconds: elapsed,
    averageChunkTime: avgChunkTime,
    etaSeconds,
  };

  saveActiveRun(run);
  callbacks.onProgress({
    currentChunk: run.processedChunks,
    totalChunks: run.totalChunks,
    percent: run.progress.percent,
    runningChunks: [],
    completedChunks: run.processedChunks,
    etaSeconds,
  });

  callbacks.onWaveComplete?.(waveIndex);
  addSessionLog(`Wave ${waveIndex}: Completed (${successCount} success, ${failCount} fail, ${abortCount} abort)`, 'info');

  // If majority failed due to rate limit, suggest fallback
  if (rateLimitCount >= chunkIndices.length / 2) {
    addSessionLog(`Wave ${waveIndex}: Multiple rate limits detected, suggesting fallback to sequential`, 'warning');
    return { success: failCount === 0, fallbackToSequential: true };
  }

  // If any chunk failed (not just rate limit), stop
  if (failCount > 0) {
    return { success: false };
  }

  // If all aborted, stop
  if (abortCount === chunkIndices.length) {
    return { success: false };
  }

  return { success: true };
}

// Sequential fallback for rate-limited scenarios
async function runSequential(
  run: ActiveRun,
  startIndex: number,
  file: FileState,
  chunkConfig: ChunkConfig,
  draft: DraftSettings,
  providerConfig: ProviderConfig,
  callbacks: TranslationCallbacks,
  abortSignal: AbortSignal
): Promise<boolean> {
  
  addSessionLog('Switching to sequential mode due to rate limiting', 'warning');
  
  const totalChunks = run.chunks.length;
  const startTime = Date.now();
  let processedThisSession = 0;

  for (let i = startIndex; i < totalChunks; i++) {
    if (abortSignal.aborted) {
      run.status = 'paused';
      saveActiveRun(run);
      addSessionLog('Translation paused by user', 'warning');
      return false;
    }

    const chunkRecord = run.chunks[i];
    if (chunkRecord.status === 'success' || chunkRecord.status === 'truncated') {
      continue;
    }

    const result = await runSingleChunk(
      i,
      chunkRecord,
      file,
      chunkConfig,
      draft,
      providerConfig,
      callbacks,
      abortSignal
    );

    if (!result.success) {
      if (result.error === 'Aborted') {
        run.status = 'paused';
        saveActiveRun(run);
        return false;
      }

      // Check for retries
      if (chunkConfig.refusalRecoveryEnabled && chunkRecord.retryCount < 2) {
        chunkRecord.retryCount++;
        addSessionLog(`Retrying chunk ${i + 1} (${chunkRecord.retryCount}/2)...`, 'warning');
        saveActiveRun(run);
        i--;
        continue;
      }

      run.status = 'failed';
      saveActiveRun(run);
      callbacks.onError(result.error || 'Chunk failed');
      return false;
    }

    processedThisSession++;

    // Update progress
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const avgChunkTime = elapsed / Math.max(processedThisSession, 1);
    const remaining = totalChunks - i - 1;
    const etaSeconds = Math.round(avgChunkTime * remaining);

    run.progress = {
      percent: Math.round(((i + 1) / totalChunks) * 100),
      elapsedSeconds: elapsed,
      averageChunkTime: avgChunkTime,
      etaSeconds,
    };

    saveActiveRun(run);
    callbacks.onProgress({
      currentChunk: i + 1,
      totalChunks,
      percent: run.progress.percent,
      runningChunks: [],
      completedChunks: i + 1,
      etaSeconds,
    });

    // Small delay antar chunk dalam sequential mode
    if (i < totalChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return true;
}

// Main chunk runner dengan parallel waves
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
  const maxParallel = chunkConfig.maxParallelChunks;

  addSessionLog(`Starting translation with max ${maxParallel} parallel chunks`, 'info');

  // Build waves
  const waves: number[][] = [];
  let currentWave: number[] = [];

  for (let i = startIndex; i < totalChunks; i++) {
    if (run.chunks[i].status === 'success' || run.chunks[i].status === 'truncated') {
      continue;
    }

    currentWave.push(i);

    if (currentWave.length >= maxParallel) {
      waves.push([...currentWave]);
      currentWave = [];
    }
  }

  if (currentWave.length > 0) {
    waves.push(currentWave);
  }

  addSessionLog(`Created ${waves.length} waves for ${totalChunks - startIndex} remaining chunks`, 'info');

  let useSequential = false;

  for (const wave of waves) {
    if (abortSignal.aborted) {
      run.status = 'paused';
      saveActiveRun(run);
      addSessionLog('Translation paused by user', 'warning');
      return;
    }

    if (useSequential) {
      // Continue with sequential
      const success = await runSequential(
        run,
        wave[0],
        file,
        chunkConfig,
        draft,
        providerConfig,
        callbacks,
        abortSignal
      );
      if (!success) return;
    } else {
      // Try parallel
      const result = await runWave(
        run,
        wave,
        file,
        chunkConfig,
        draft,
        providerConfig,
        callbacks,
        abortSignal
      );

      if (!result.success) {
        if (result.fallbackToSequential) {
          useSequential = true;
          // Continue this wave with sequential
          const seqSuccess = await runSequential(
            run,
            wave[0],
            file,
            chunkConfig,
            draft,
            providerConfig,
            callbacks,
            abortSignal
          );
          if (!seqSuccess) return;
        } else {
          // Real error, stop
          run.status = 'failed';
          saveActiveRun(run);
          return;
        }
      }

      // Small delay antar wave untuk menghindari rate limit
      if (waves.indexOf(wave) < waves.length - 1) {
        await new Promise(resolve => setTimeout(resolve, WAVE_DELAY_MS));
      }
    }
  }

  // Merge and complete
  const finalOutput = mergeChunks(
    run.chunks.map(c => c.translatedCore),
    chunkConfig.overlapLines,
    file.format
  );

  run.status = 'completed';
  run.completedAt = Date.now();
  run.progress.percent = 100;
  run.processedChunks = run.chunks.filter(
    c => c.status === 'success' || c.status === 'truncated'
  ).length;

  saveActiveRun(run);
  addSessionLog('Translation completed', 'info');
  callbacks.onComplete(finalOutput);
}

export async function startTranslation(
  config: TranslationConfig,
  callbacks: TranslationCallbacks
): Promise<void> {
  const { file, draft, abortSignal } = config;

  addSessionLog('Starting translation process...', 'info');

  const fileValidation = validateFile(file);
  if (!fileValidation.valid) {
    const errorMsg = fileValidation.issues.map(i => i.message).join('; ');
    addSessionLog(`File validation failed: ${errorMsg}`, 'error');
    callbacks.onError(errorMsg);
    return;
  }

  const providerValidation = validateProviderConfig({
    endpointUrl: draft.endpointUrl,
    model: draft.model,
    apiKey: draft.apiKey,
    extraHeadersJson: draft.extraHeadersJson,
  });

  if (!providerValidation.valid) {
    const errorMsg = providerValidation.issues.map(i => i.message).join('; ');
    addSessionLog(`Provider validation failed: ${errorMsg}`, 'error');
    callbacks.onError(errorMsg);
    return;
  }

  const chunkConfig: ChunkConfig = {
    sourceLanguage: draft.sourceLanguage === 'custom' ? draft.sourceLanguageCustom : draft.sourceLanguage,
    targetLanguage: draft.targetLanguage === 'custom' ? draft.targetLanguageCustom : draft.targetLanguage,
    instruction: draft.useDefaultInstruction ? '' : draft.customInstruction,
    novelModeEnabled: draft.novelModeEnabled,
    refusalRecoveryEnabled: draft.refusalRecoveryEnabled,
    maxCharsPerChunk: draft.maxCharsPerChunk,
    overlapLines: draft.overlapLines,
    maxParallelChunks: draft.maxParallelChunks,
    autoSplit: draft.autoSplit,
  };

  const { chunks: originalChunks } = splitFileContent(
    file.content,
    file.format,
    {
      maxCharsPerChunk: chunkConfig.maxCharsPerChunk,
      overlapLines: chunkConfig.overlapLines,
      autoSplit: chunkConfig.autoSplit,
    }
  );

  addSessionLog(`Split into ${originalChunks.length} chunks`, 'info');

  const chunkRecords: ChunkRecord[] = originalChunks.map((original, index) => ({
    index,
    original,
    translatedCore: '',
    status: 'pending' as const,
    startTime: null,
    endTime: null,
    retryCount: 0,
    error: null,
    diagnostics: [],
    validationIssues: [],
  }));

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

  const providerConfig = buildProviderConfig(draft);

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

  const providerValidation = validateProviderConfig({
    endpointUrl: draft.endpointUrl,
    model: draft.model,
    apiKey: draft.apiKey,
    extraHeadersJson: draft.extraHeadersJson,
  });

  if (!providerValidation.valid) {
    const errorMsg = providerValidation.issues.map(i => i.message).join('; ');
    addSessionLog(`Provider validation failed: ${errorMsg}`, 'error');
    callbacks.onError(errorMsg);
    return;
  }

  const firstUnfinished = run.chunks.findIndex(c => c.status !== 'success' && c.status !== 'truncated');
  const startIndex = firstUnfinished === -1 ? run.chunks.length : firstUnfinished;

  run.status = 'running';
  if (!run.startedAt) run.startedAt = Date.now();
  saveActiveRun(run);

  const providerConfig = buildProviderConfig(draft);

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
