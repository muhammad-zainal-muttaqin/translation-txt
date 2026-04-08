import type { ProviderConfig, ChunkRecord } from '../types';

export interface ProviderResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Wraps fetch with a request timeout and forwards an external AbortSignal.
 * Either source (timeout or external abort) cancels the request cleanly.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  options: CallOptions
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();

  const onExternalAbort = () => controller.abort(options.signal?.reason);
  if (options.signal) {
    if (options.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Distinguish timeout from user-initiated cancellation
      if (controller.signal.reason instanceof DOMException && controller.signal.reason.name === 'TimeoutError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s. The provider did not respond within the deadline — try a smaller "Max chars per chunk", a lower "Max output tokens", or a faster model.`);
      }
      throw err;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export async function callOpenAICompatible(
  config: ProviderConfig,
  prompt: string,
  options: CallOptions = {}
): Promise<ProviderResponse> {
  const { endpointUrl, model, apiKey, extraHeaders, maxOutputTokens } = config;

  const response = await fetchWithTimeout(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens ?? 8192,
      stream: true,
      messages: [
        { role: 'system', content: 'You are a helpful translation assistant.' },
        { role: 'user', content: prompt },
      ],
    }),
  }, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI-compatible API error ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new Error('OpenAI-compatible API returned an empty response body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let finishReason: string | undefined;
  let usage: ProviderResponse['usage'];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const rawLine = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const line = rawLine.replace(/\r$/, '').trim();
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const event = JSON.parse(payload);
          const delta = event.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') content += delta;
          const fr = event.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
          if (event.usage) {
            usage = {
              promptTokens: event.usage.prompt_tokens,
              completionTokens: event.usage.completion_tokens,
              totalTokens: event.usage.total_tokens,
            };
          }
        } catch {
          // Skip malformed SSE lines (some providers emit keep-alives)
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content, finishReason, usage };
}

export async function callAnthropic(
  config: ProviderConfig,
  prompt: string,
  options: CallOptions = {}
): Promise<ProviderResponse> {
  const { endpointUrl, model, apiKey, extraHeaders, anthropicVersion, maxOutputTokens } = config;

  const response = await fetchWithTimeout(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': anthropicVersion,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens ?? 8192,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  }, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';
  // Normalize Anthropic's stop_reason to match OpenAI's 'length' for truncation detection
  const finishReason = data.stop_reason === 'max_tokens' ? 'length' : data.stop_reason;
  const usage = data.usage;

  return { content, finishReason, usage };
}

export async function callGemini(
  config: ProviderConfig,
  prompt: string,
  options: CallOptions = {}
): Promise<ProviderResponse> {
  const { endpointUrl, model, apiKey, extraHeaders, maxOutputTokens } = config;

  const base = endpointUrl.replace(/\/+$/, '');
  const url = `${base}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxOutputTokens ?? 8192,
      },
    }),
  }, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const rawFinishReason = data.candidates?.[0]?.finishReason;
  // Normalize Gemini's MAX_TOKENS to match OpenAI's 'length' for truncation detection
  const finishReason = rawFinishReason === 'MAX_TOKENS' ? 'length' : rawFinishReason;

  return { content, finishReason };
}

export async function callProvider(
  config: ProviderConfig,
  prompt: string,
  options: CallOptions = {}
): Promise<ProviderResponse> {
  const { protocol } = config;

  switch (protocol) {
    case 'openai-compatible':
      return callOpenAICompatible(config, prompt, options);
    case 'anthropic-compatible':
      return callAnthropic(config, prompt, options);
    case 'gemini':
      return callGemini(config, prompt, options);
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}

export function buildChunkRecord(
  index: number,
  original: string
): ChunkRecord {
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
