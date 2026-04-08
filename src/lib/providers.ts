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

export async function callOpenAICompatible(
  config: ProviderConfig,
  prompt: string
): Promise<ProviderResponse> {
  const { endpointUrl, model, apiKey, extraHeaders } = config;

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful translation assistant.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI-compatible API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const finishReason = data.choices?.[0]?.finish_reason;
  const usage = data.usage;

  return { content, finishReason, usage };
}

export async function callAnthropic(
  config: ProviderConfig,
  prompt: string
): Promise<ProviderResponse> {
  const { endpointUrl, apiKey, extraHeaders, anthropicVersion } = config;
  const model = config.model || 'claude-sonnet-4-20250514';

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': anthropicVersion,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';
  const finishReason = data.stop_reason;
  const usage = data.usage;

  return { content, finishReason, usage };
}

export async function callGemini(
  config: ProviderConfig,
  prompt: string
): Promise<ProviderResponse> {
  const { endpointUrl, model, apiKey, extraHeaders } = config;

  const url = `${endpointUrl}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const finishReason = data.candidates?.[0]?.finishReason;

  return { content, finishReason };
}

export async function callProvider(
  config: ProviderConfig,
  prompt: string
): Promise<ProviderResponse> {
  const { protocol } = config;

  switch (protocol) {
    case 'openai-compatible':
      return callOpenAICompatible(config, prompt);
    case 'anthropic-compatible':
      return callAnthropic(config, prompt);
    case 'gemini':
      return callGemini(config, prompt);
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
