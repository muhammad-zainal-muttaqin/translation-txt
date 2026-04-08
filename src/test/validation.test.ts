import { describe, it, expect } from 'vitest'
import {
  validateFile,
  validateProviderConfig,
} from '../lib/validation'
import type { FileState, ValidationIssue } from '../types'

describe('validation', () => {
  describe('validateFile', () => {
    it('should validate a valid text file', () => {
      const file: FileState = {
        name: 'test.txt',
        format: 'txt',
        size: 1000,
        lineCount: 10,
        content: 'Hello world',
      }

      const result = validateFile(file)

      expect(result.valid).toBe(true)
      expect(result.issues.filter(i => i.level === 'error')).toHaveLength(0)
    })

    it('should reject unsupported format', () => {
      const file: FileState = {
        name: 'test.exe',
        format: 'exe',
        size: 1000,
        lineCount: 10,
        content: 'binary',
      }

      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'UNSUPPORTED_FORMAT' })
      )
    })

    it('should reject file exceeding 500MB size limit', () => {
      const file: FileState = {
        name: 'test.txt',
        format: 'txt',
        size: 600 * 1024 * 1024, // 600MB - exceeds 500MB limit
        lineCount: 1000,
        content: 'x'.repeat(1000),
      }

      const result = validateFile(file)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'FILE_TOO_LARGE' })
      )
    })

    it('should reject file with too many lines', () => {
      // Large line counts are now fully supported, only shows info message
      const file: FileState = {
        name: 'test.txt',
        format: 'txt',
        size: 1000,
        lineCount: 600000,
        content: 'line\n'.repeat(600000),
      }

      const result = validateFile(file)

      // Should be valid now (no error, just info)
      expect(result.valid).toBe(true)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'LARGE_LINE_COUNT', level: 'info' })
      )
    })

    it('should warn about very large files over 500MB', () => {
      const file: FileState = {
        name: 'test.txt',
        format: 'txt',
        size: 550 * 1024 * 1024, // 550MB - triggers warning
        lineCount: 100000,
        content: 'x'.repeat(1000),
      }

      const result = validateFile(file)

      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'LARGE_FILE' })
      )
    })

    it('should validate JSON format', () => {
      const validJson: FileState = {
        name: 'test.json',
        format: 'json',
        size: 100,
        lineCount: 5,
        content: '{"name": "test"}',
      }

      const result = validateFile(validJson)

      expect(result.issues.filter(i => i.code === 'INVALID_JSON')).toHaveLength(0)
    })

    it('should reject invalid JSON', () => {
      const invalidJson: FileState = {
        name: 'test.json',
        format: 'json',
        size: 100,
        lineCount: 5,
        content: '{ invalid json }',
      }

      const result = validateFile(invalidJson)

      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'INVALID_JSON' })
      )
    })

    it('should warn about malformed SRT', () => {
      const malformedSrt: FileState = {
        name: 'test.srt',
        format: 'srt',
        size: 100,
        lineCount: 5,
        content: 'This is not a valid SRT file',
      }

      const result = validateFile(malformedSrt)

      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'MALFORMED_SRT' })
      )
    })

    it('should warn about malformed VTT', () => {
      const malformedVtt: FileState = {
        name: 'test.vtt',
        format: 'vtt',
        size: 100,
        lineCount: 5,
        content: 'Not a WEBVTT file',
      }

      const result = validateFile(malformedVtt)

      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'MALFORMED_VTT' })
      )
    })

    it('should warn about VTT without WEBVTT header', () => {
      const vttWithoutHeader: FileState = {
        name: 'test.vtt',
        format: 'vtt',
        size: 100,
        lineCount: 5,
        content: '00:00:01.000 --> 00:00:04.000\nSubtitle',
      }

      const result = validateFile(vttWithoutHeader)

      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'MALFORMED_VTT' })
      )
    })

    it('should validate missing filename', () => {
      const file: FileState = {
        name: '',
        format: 'txt',
        size: 100,
        lineCount: 10,
        content: 'Hello',
      }

      const result = validateFile(file)

      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'MISSING_FILENAME' })
      )
    })
  })

  describe('validateProviderConfig', () => {
    it('should validate complete provider config', () => {
      const config = {
        endpointUrl: 'https://api.example.com/v1/chat/completions',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
      }

      const result = validateProviderConfig(config)

      expect(result.valid).toBe(true)
      expect(result.issues.filter(i => i.level === 'error')).toHaveLength(0)
    })

    it('should reject missing endpoint', () => {
      const config = {
        endpointUrl: '',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
      }

      const result = validateProviderConfig(config)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'MISSING_ENDPOINT' })
      )
    })

    it('should reject invalid endpoint URL', () => {
      const config = {
        endpointUrl: 'not-a-url',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
      }

      const result = validateProviderConfig(config)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'INVALID_ENDPOINT' })
      )
    })

    it('should reject missing model', () => {
      const config = {
        endpointUrl: 'https://api.example.com',
        model: '',
        apiKey: 'sk-test-key',
      }

      const result = validateProviderConfig(config)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'MISSING_MODEL' })
      )
    })

    it('should warn about missing API key', () => {
      const config = {
        endpointUrl: 'https://api.example.com',
        model: 'gpt-4',
        apiKey: '',
      }

      const result = validateProviderConfig(config)

      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'MISSING_API_KEY' })
      )
    })
  })
})
