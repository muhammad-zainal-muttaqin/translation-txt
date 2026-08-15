import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startTranslation, type TranslationCallbacks } from '../lib/translate';
import type { ActiveRun, DraftSettings, FileState } from '../types';
import * as providers from '../lib/providers';
import * as storage from '../lib/storage';
import * as chunker from '../lib/chunker';

vi.mock('../lib/providers', () => ({
  callProvider: vi.fn(),
}));

vi.mock('../lib/storage', () => ({
  saveActiveRun: vi.fn(),
  generateRunId: vi.fn(() => 'recovery-run'),
  addSessionLog: vi.fn(),
}));

vi.mock('../lib/chunker', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/chunker')>();
  return {
    ...actual,
    splitFileContent: vi.fn(),
  };
});

function draft(): DraftSettings {
  return {
    providerProtocol: 'openai-compatible',
    providerPreset: 'test',
    endpointUrl: 'https://example.test/v1/chat/completions',
    model: 'test-model',
    apiKey: 'test-key',
    rememberOnDevice: false,
    extraHeadersJson: '',
    anthropicVersion: '2023-06-01',
    profileName: '',
    sourceLanguage: 'en',
    sourceLanguageCustom: '',
    targetLanguage: 'id',
    targetLanguageCustom: '',
    useDefaultInstruction: true,
    customInstruction: '',
    novelModeEnabled: false,
    refusalRecoveryEnabled: false,
    autoSplit: true,
    maxCharsPerChunk: 9000,
    overlapLines: 0,
    maxParallelChunks: 1,
    parallelMultiplier: 1,
    maxOutputTokens: 1000,
  };
}

const file: FileState = {
  name: 'source.txt',
  format: 'txt',
  size: 20,
  lineCount: 2,
  content: 'line one\nline two',
};

function callbacks(): TranslationCallbacks {
  return {
    onChunkStart: vi.fn(),
    onChunkComplete: vi.fn(),
    onChunkError: vi.fn(),
    onProgress: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  };
}

function savedRuns(): ActiveRun[] {
  return vi.mocked(storage.saveActiveRun).mock.calls
    .map(([run]) => run as ActiveRun | null)
    .filter((run): run is ActiveRun => run !== null);
}

describe('translation recovery controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chunker.splitFileContent).mockReturnValue({
      chunks: [file.content],
      config: { maxCharsPerChunk: 9000, overlapLines: 0 },
    });
  });

  it('stops after the initial request plus five retries for invalid output', async () => {
    vi.mocked(providers.callProvider).mockResolvedValue({
      content: '',
      finishReason: 'stop',
    });
    const cb = callbacks();

    await startTranslation({ file, draft: draft(), abortSignal: new AbortController().signal }, cb);

    expect(providers.callProvider).toHaveBeenCalledTimes(6);
    expect(cb.onComplete).not.toHaveBeenCalled();
    expect(cb.onError).toHaveBeenCalled();
    expect(savedRuns().at(-1)?.status).toBe('failed');
    expect(savedRuns().at(-1)?.chunks[0].status).toBe('failed-validation');
  });

  it('rescues persistent truncation with ordered sequential subparts', async () => {
    vi.mocked(chunker.splitFileContent)
      .mockReturnValueOnce({ chunks: [file.content], config: { maxCharsPerChunk: 9000, overlapLines: 0 } })
      .mockReturnValueOnce({ chunks: ['line one', 'line two'], config: { maxCharsPerChunk: 1000, overlapLines: 0 } });

    let calls = 0;
    vi.mocked(providers.callProvider).mockImplementation(async () => {
      calls++;
      if (calls <= 6) return { content: 'partial', finishReason: 'length' };
      return { content: calls === 7 ? 'satu' : 'dua', finishReason: 'stop' };
    });
    const cb = callbacks();

    await startTranslation({ file, draft: draft(), abortSignal: new AbortController().signal }, cb);

    const run = savedRuns().at(-1);
    expect(calls).toBe(8);
    expect(run?.status).toBe('completed');
    expect(run?.chunks[0].status).toBe('success');
    expect(run?.chunks[0].rescueCount).toBe(2);
    expect(cb.onComplete).toHaveBeenCalledWith('satu\ndua');
  });

  it('does not retry permanent authentication errors', async () => {
    const error = Object.assign(new Error('Unauthorized'), { status: 401 });
    vi.mocked(providers.callProvider).mockRejectedValue(error);
    const cb = callbacks();

    await startTranslation({ file, draft: draft(), abortSignal: new AbortController().signal }, cb);

    expect(providers.callProvider).toHaveBeenCalledTimes(1);
    expect(savedRuns().at(-1)?.status).toBe('failed');
    expect(cb.onComplete).not.toHaveBeenCalled();
  });

  it('pauses instead of failing when aborted during retry backoff', async () => {
    const controller = new AbortController();
    vi.mocked(providers.callProvider).mockImplementation(async () => {
      setTimeout(() => controller.abort(), 5);
      throw new Error('429 rate limit exceeded');
    });
    const cb = callbacks();

    await startTranslation({ file, draft: draft(), abortSignal: controller.signal }, cb);

    expect(providers.callProvider).toHaveBeenCalledTimes(1);
    expect(savedRuns().at(-1)?.status).toBe('paused');
    expect(cb.onComplete).not.toHaveBeenCalled();
  });
});
