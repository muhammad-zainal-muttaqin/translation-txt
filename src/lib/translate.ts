import type { 
  DraftSettings, 
  FileState, 
  ChunkConfig, 
  ActiveRun, 
  ChunkRecord, 
  ProviderConfig,
  ValidationIssue 
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
}

export interface TranslationCallbacks {
  onChunkStart: (index: number) => void;
  onChunkComplete: (index: number, result: string) => void;
  onChunkError: (index: number, error: string) => void;
  onProgress: (progress: TranslationProgress) => void;
  onComplete: (output: string) => void;
  onError: (error: string) => void;
}

export interface TranslationConfig {
  file: FileState;
  draft: DraftSettings;
  abortSignal: AbortSignal;
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

  const { chunks: originalChunks, config: splitConfig } = splitFileContent(
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

  const providerConfig: ProviderConfig = {
    protocol: draft.providerProtocol,
    preset: null,
    endpointUrl: draft.endpointUrl,
    model: draft.model,
    apiKey: draft.apiKey,
    extraHeaders: draft.extraHeadersJson ? JSON.parse(draft.extraHeadersJson) : {},
    anthropicVersion: draft.anthropicVersion,
  };

  const startTime = Date.now();

  for (let i = 0; i < originalChunks.length; i++) {
    if (abortSignal.aborted) {
      run.status = 'paused';
      saveActiveRun(run);
      addSessionLog('Translation paused by user', 'warning');
      return;
    }

    const chunkRecord = run.chunks[i];
    chunkRecord.status = 'running';
    chunkRecord.startTime = Date.now();

    callbacks.onChunkStart(i);
    callbacks.onProgress({
      currentChunk: i + 1,
      totalChunks: originalChunks.length,
      percent: Math.round((i / originalChunks.length) * 100),
    });

    saveActiveRun(run);

    addSessionLog(`Translating chunk ${i + 1}/${originalChunks.length}...`, 'info');

    try {
      const prompt = buildTranslationPrompt(chunkRecord.original, file.format, {
        sourceLanguage: chunkConfig.sourceLanguage,
        targetLanguage: chunkConfig.targetLanguage,
        customInstruction: chunkConfig.instruction,
        useDefaultInstruction: draft.useDefaultInstruction,
      });

      const response = await callProvider(providerConfig, prompt);

      if (abortSignal.aborted) {
        run.status = 'paused';
        saveActiveRun(run);
        return;
      }

      const translatedText = response.content.trim();

      if (response.finishReason === 'length') {
        chunkRecord.status = 'truncated';
        chunkRecord.error = 'Output was truncated due to length limits.';
        chunkRecord.translatedCore = translatedText;
        run.chunks[i] = chunkRecord;
        
        addSessionLog(`Chunk ${i + 1} truncated`, 'warning');
        callbacks.onChunkError(i, chunkRecord.error);
      } else {
        chunkRecord.status = 'success';
        chunkRecord.translatedCore = translatedText;
        run.chunks[i] = chunkRecord;
        
        addSessionLog(`Chunk ${i + 1} completed`, 'info');
        callbacks.onChunkComplete(i, translatedText);
      }

      chunkRecord.endTime = Date.now();
      run.processedChunks = i + 1;

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const avgChunkTime = elapsed / (i + 1);
      const remaining = originalChunks.length - i - 1;
      const etaSeconds = Math.round(avgChunkTime * remaining);

      run.progress = {
        percent: Math.round(((i + 1) / originalChunks.length) * 100),
        elapsedSeconds: elapsed,
        averageChunkTime: avgChunkTime,
        etaSeconds,
      };

      saveActiveRun(run);

      callbacks.onProgress({
        currentChunk: i + 1,
        totalChunks: originalChunks.length,
        percent: run.progress.percent,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      chunkRecord.status = 'failed';
      chunkRecord.error = errorMessage;
      chunkRecord.endTime = Date.now();
      run.chunks[i] = chunkRecord;

      addSessionLog(`Chunk ${i + 1} failed: ${errorMessage}`, 'error');
      callbacks.onChunkError(i, errorMessage);
      
      if (chunkConfig.refusalRecoveryEnabled && chunkRecord.retryCount < 2) {
        chunkRecord.retryCount++;
        addSessionLog(`Retrying chunk ${i + 1} (${chunkRecord.retryCount}/2)...`, 'warning');
        
        run.chunks[i] = chunkRecord;
        saveActiveRun(run);
        
        i--;
        continue;
      }

      run.status = 'failed';
      saveActiveRun(run);
      callbacks.onError(errorMessage);
      return;
    }
  }

  const finalOutput = mergeChunks(
    run.chunks.map(c => c.translatedCore),
    splitConfig.overlapLines,
    file.format
  );

  run.status = 'completed';
  run.completedAt = Date.now();
  run.progress.percent = 100;

  saveActiveRun(run);
  addSessionLog('Translation completed', 'info');
  callbacks.onComplete(finalOutput);
}

export function pauseTranslation(): void {
  addSessionLog('Translation paused', 'info');
}

export function cancelTranslation(): void {
  addSessionLog('Translation cancelled', 'info');
}

export function discardActiveRun(): void {
  saveActiveRun(null);
  addSessionLog('Active run discarded', 'info');
}
