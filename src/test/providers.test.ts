import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  callOpenAICompatible,
  callAnthropic,
  callGemini,
} from '../lib/providers'
import type { ProviderConfig } from '../types'

describe('providers', () => {
  const mockFetch = vi.fn()
  global.fetch = mockFetch

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('callOpenAICompatible', () => {
    it('should call OpenAI-compatible endpoint and return content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Translated text' } }],
        }),
      })

      const config: ProviderConfig = {
        protocol: 'openai-compatible',
        preset: null,
        endpointUrl: 'https://api.example.com/v1/chat/completions',
        model: 'gpt-4',
        apiKey: 'test-key',
        extraHeaders: {},
        anthropicVersion: '',
      }

      const result = await callOpenAICompatible(config, 'Translate this')

      expect(result.content).toBe('Translated text')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      const config: ProviderConfig = {
        protocol: 'openai-compatible',
        preset: null,
        endpointUrl: 'https://api.example.com/v1/chat/completions',
        model: 'gpt-4',
        apiKey: 'invalid-key',
        extraHeaders: {},
        anthropicVersion: '',
      }

      await expect(callOpenAICompatible(config, 'Translate this')).rejects.toThrow(
        'OpenAI-compatible API error 401: Unauthorized'
      )
    })
  })

  describe('callAnthropic', () => {
    it('should call Anthropic endpoint and return content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Translated text' }],
          stop_reason: 'end_turn',
        }),
      })

      const config: ProviderConfig = {
        protocol: 'anthropic-compatible',
        preset: null,
        endpointUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3',
        apiKey: 'sk-ant-test-key',
        extraHeaders: {},
        anthropicVersion: '2023-06-01',
      }

      const result = await callAnthropic(config, 'Translate this')

      expect(result.content).toBe('Translated text')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      )
    })

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      })

      const config: ProviderConfig = {
        protocol: 'anthropic-compatible',
        preset: null,
        endpointUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3',
        apiKey: 'invalid-key',
        extraHeaders: {},
        anthropicVersion: '2023-06-01',
      }

      await expect(callAnthropic(config, 'Translate this')).rejects.toThrow(
        'Anthropic API error 400: Bad Request'
      )
    })
  })

  describe('callGemini', () => {
    it('should call Gemini endpoint and return content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Translated text' }] } }],
        }),
      })

      const config: ProviderConfig = {
        protocol: 'gemini',
        preset: null,
        endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-pro',
        apiKey: 'test-key',
        extraHeaders: {},
        anthropicVersion: '',
      }

      const result = await callGemini(config, 'Translate this')

      expect(result.content).toBe('Translated text')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should throw error when content is blocked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          promptFeedback: { blockReason: 'SAFETY' },
        }),
      })

      const config: ProviderConfig = {
        protocol: 'gemini',
        preset: null,
        endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-pro',
        apiKey: 'test-key',
        extraHeaders: {},
        anthropicVersion: '',
      }

      await expect(callGemini(config, 'Translate this')).rejects.toThrow(
        'Content blocked: SAFETY'
      )
    })
  })
})
