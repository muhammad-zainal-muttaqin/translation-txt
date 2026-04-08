import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startTranslation, resumeTranslation, TranslationCallbacks, TranslationConfig, ResumeTranslationConfig } from '../lib/translate';
import type { FileState, DraftSettings, ActiveRun } from '../types';
import * as storage from '../lib/storage';
import * as providers from '../lib/providers';
import * as chunker from '../lib/chunker';

// Mocks
vi.mock('../lib/storage', () => ({
  saveActiveRun: vi.fn(),
  generateRunId: vi.fn(() => 'test-run-id'),
  addSessionLog: vi.fn(),
  loadActiveRun: vi.fn(),
}));

vi.mock('../lib/providers', () => ({
  callProvider: vi.fn(),
}));

vi.mock('../lib/chunker', () => ({
  splitFileContent: vi.fn(),
  mergeChunks: vi.fn((chunks) => chunks.join('\n')),
}));

vi.mock('../lib/validation', () => ({
  validateFile: vi.fn(() => ({ valid: true, issues: [] })),
  validateProviderConfig: vi.fn(() => ({ valid: true, issues: [] })),
}));

vi.mock('../lib/prompts', () => ({
  buildTranslationPrompt: vi.fn((content) => `Prompt: ${content}`),
}));

describe('Parallel Translation', () => {
  const mockFile: FileState = {
    name: 'test.txt',
    format: 'txt',
    size: 1000,
    lineCount: 50,
    content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
  };

  const mockDraft: DraftSettings = {
    providerProtocol: 'openai-compatible',
    providerPreset: 'openrouter',
    endpointUrl: 'https://api.test.com',
    model: 'test-model',
    apiKey: 'test-key',
    rememberOnDevice: false,
    extraHeadersJson: '',
    anthropicVersion: '2023-06-01',
    profileName: '',
    sourceLanguage: 'auto',
    sourceLanguageCustom: '',
    targetLanguage: 'en',
    targetLanguageCustom: '',
    useDefaultInstruction: true,
    customInstruction: '',
    novelModeEnabled: false,
    refusalRecoveryEnabled: true,
    autoSplit: true,
    maxCharsPerChunk: 1000,
    overlapLines: 0,
    maxParallelChunks: 3,
    parallelMultiplier: 1,
    maxOutputTokens: 65536,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wave-based parallel execution', () => {
    it('should process chunks in parallel waves', async () => {
      // Setup: 6 chunks dengan maxParallel = 3
      const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3', 'Chunk 4', 'Chunk 5', 'Chunk 6'];
      
      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      // Mock API calls - simulate delay untuk membuktikan parallel
      let activeCalls = 0;
      let maxConcurrentCalls = 0;
      
      vi.mocked(providers.callProvider).mockImplementation(async () => {
        activeCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCalls);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        activeCalls--;
        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
        onWaveStart: vi.fn(),
        onWaveComplete: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: mockDraft,
        abortSignal: abortController.signal,
      };

      await startTranslation(config, callbacks);

      // Assert
      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
      
      // Verify waves were called
      expect(callbacks.onWaveStart).toHaveBeenCalledTimes(2); // 2 waves for 6 chunks
      expect(callbacks.onWaveComplete).toHaveBeenCalledTimes(2);
      
      // Wave 1 should process chunks 0,1,2
      expect(callbacks.onWaveStart).toHaveBeenNthCalledWith(1, 1, [0, 1, 2]);
      // Wave 2 should process chunks 3,4,5
      expect(callbacks.onWaveStart).toHaveBeenNthCalledWith(2, 2, [3, 4, 5]);
      
      // Verify parallel execution (harus ada multiple concurrent calls)
      expect(maxConcurrentCalls).toBeGreaterThan(1);
      expect(maxConcurrentCalls).toBeLessThanOrEqual(3);
    });

    it('should handle rate limit with fallback to sequential', async () => {
      const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3'];
      
      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      let callCount = 0;
      vi.mocked(providers.callProvider).mockImplementation(async () => {
        callCount++;
        // Rate limit pada call pertama
        if (callCount <= 2) {
          const error = new Error('429 Too Many Requests - rate limit exceeded');
          throw error;
        }
        
        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: mockDraft,
        abortSignal: abortController.signal,
      };

      await startTranslation(config, callbacks);

      // Should eventually complete despite rate limits
      expect(callbacks.onComplete).toHaveBeenCalled();
    });

    it('should update progress with completed chunks tracking', async () => {
      const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3'];
      
      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      const progressUpdates: any[] = [];
      const waveUpdates: any[] = [];
      
      vi.mocked(providers.callProvider).mockImplementation(async () => {
        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
        onWaveStart: (waveIndex, chunkIndices) => {
          waveUpdates.push({ waveIndex, chunkIndices });
        },
        onWaveComplete: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: mockDraft,
        abortSignal: abortController.signal,
      };

      await startTranslation(config, callbacks);

      // Verify wave tracking
      expect(waveUpdates.length).toBeGreaterThan(0);
      expect(waveUpdates[0].chunkIndices.length).toBeGreaterThan(0);
      
      // Verify completedChunks tracking in final progress
      expect(progressUpdates[progressUpdates.length - 1].completedChunks).toBe(3);
      
      // Verify percent increases
      expect(progressUpdates[progressUpdates.length - 1].percent).toBe(100);
    });
  });

  describe('Sequential fallback', () => {
    it('should switch to sequential when rate limit detected in parallel', async () => {
      const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3', 'Chunk 4'];
      
      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      let callCount = 0;
      vi.mocked(providers.callProvider).mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Semua call pertama kena rate limit
        if (callCount <= 3) {
          throw new Error('429 rate limit exceeded');
        }
        
        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: { ...mockDraft, maxParallelChunks: 3 },
        abortSignal: abortController.signal,
      };

      await startTranslation(config, callbacks);

      // Should complete via sequential fallback
      expect(callbacks.onComplete).toHaveBeenCalled();
      
      // Call count should be high due to retries
      expect(callCount).toBeGreaterThan(4);
    });

    it('keeps progress monotonic when falling back from parallel to sequential', async () => {
      const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3', 'Chunk 4'];

      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      let callCount = 0;
      vi.mocked(providers.callProvider).mockImplementation(async () => {
        callCount++;
        if (callCount <= 3) {
          throw new Error('429 rate limit exceeded');
        }

        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const progressUpdates: number[] = [];
      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: (progress) => {
          progressUpdates.push(progress.completedChunks);
        },
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: { ...mockDraft, maxParallelChunks: 3 },
        abortSignal: abortController.signal,
      };

      await startTranslation(config, callbacks);

      expect(progressUpdates).toEqual([...progressUpdates].sort((a, b) => a - b));
      expect(progressUpdates[progressUpdates.length - 1]).toBe(4);
    });
  });

  describe('Resume with parallel', () => {
    it('should resume from last incomplete wave', async () => {
      const chunks = [
        { index: 0, original: 'Chunk 1', translatedCore: 'Done', status: 'success' as const, startTime: null, endTime: null, retryCount: 0, error: null, diagnostics: [], validationIssues: [] },
        { index: 1, original: 'Chunk 2', translatedCore: '', status: 'pending' as const, startTime: null, endTime: null, retryCount: 0, error: null, diagnostics: [], validationIssues: [] },
        { index: 2, original: 'Chunk 3', translatedCore: '', status: 'pending' as const, startTime: null, endTime: null, retryCount: 0, error: null, diagnostics: [], validationIssues: [] },
      ];

      const mockRun: ActiveRun = {
        id: 'test-run',
        status: 'paused',
        file: mockFile,
        config: {
          sourceLanguage: 'auto',
          targetLanguage: 'en',
          instruction: '',
          novelModeEnabled: false,
          refusalRecoveryEnabled: true,
          maxCharsPerChunk: 1000,
          overlapLines: 0,
          maxParallelChunks: 3,
          parallelMultiplier: 1,
          autoSplit: true,
        },
        chunks,
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: null,
        totalChunks: 3,
        processedChunks: 1,
        finalValidationIssues: [],
        novelContext: null,
        progress: {
          percent: 33,
          elapsedSeconds: 600,
          averageChunkTime: 600,
          etaSeconds: 1200,
        },
      };

      vi.mocked(providers.callProvider).mockImplementation(async () => {
        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: ResumeTranslationConfig = {
        run: mockRun,
        draft: mockDraft,
        abortSignal: abortController.signal,
      };

      await resumeTranslation(config, callbacks);

      // Should skip chunk 0 (already done) and process chunks 1,2
      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(providers.callProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pause handling', () => {
    it('should pause all running chunks in current wave', async () => {
      const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3'];
      
      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      let shouldPause = false;
      
      vi.mocked(providers.callProvider).mockImplementation(async (_config, _prompt, options) => {
        // Check abort signal
        if (options?.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        // Long delay untuk simulate slow API
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 10000);
          
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });

        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: mockDraft,
        abortSignal: abortController.signal,
      };

      // Start translation
      const translationPromise = startTranslation(config, callbacks);

      // Abort after 100ms
      setTimeout(() => {
        abortController.abort();
      }, 100);

      await translationPromise;

      // Verify pause was handled
      expect(callbacks.onComplete).not.toHaveBeenCalled();
    });

    it('persists paused status instead of failed when aborting a parallel wave', async () => {
      const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3'];

      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      vi.mocked(providers.callProvider).mockImplementation(async (_config, _prompt, options) => {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 10000);

          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });

        return {
          content: 'Translated',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        };
      });

      const callbacks: TranslationCallbacks = {
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(),
        onChunkError: vi.fn(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: mockDraft,
        abortSignal: abortController.signal,
      };

      const translationPromise = startTranslation(config, callbacks);

      setTimeout(() => {
        abortController.abort();
      }, 50);

      await translationPromise;

      const savedRuns = vi.mocked(storage.saveActiveRun).mock.calls
        .map(([run]) => run as ActiveRun | null)
        .filter((run): run is ActiveRun => run !== null);

      expect(savedRuns.some((run) => run.status === 'paused')).toBe(true);
      expect(savedRuns.some((run) => run.status === 'failed')).toBe(false);
      expect(callbacks.onComplete).not.toHaveBeenCalled();
    });

    it('emits updated run snapshots before chunk-complete callbacks fire', async () => {
      const chunks = ['Chunk 1'];

      vi.mocked(chunker.splitFileContent).mockReturnValue({
        chunks,
        config: {
          maxCharsPerChunk: 1000,
          overlapLines: 0,
        },
      });

      vi.mocked(providers.callProvider).mockResolvedValue({
        content: 'Translated',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      });

      let lastCompletedSnapshotStatus = '';
      const callbacks: TranslationCallbacks = {
        onRunUpdate: (run) => {
          if (run?.chunks[0]?.status === 'success') {
            lastCompletedSnapshotStatus = run.chunks[0].status;
          }
        },
        onChunkStart: vi.fn(),
        onChunkComplete: vi.fn(() => {
          expect(lastCompletedSnapshotStatus).toBe('success');
        }),
        onChunkError: vi.fn(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const abortController = new AbortController();
      const config: TranslationConfig = {
        file: mockFile,
        draft: mockDraft,
        abortSignal: abortController.signal,
      };

      await startTranslation(config, callbacks);

      expect(callbacks.onChunkComplete).toHaveBeenCalledTimes(1);
    });
  });
});
