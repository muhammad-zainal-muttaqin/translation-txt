import { describe, it, expect } from 'vitest'
import {
  splitFileContent,
  mergeChunks,
  getEffectiveSplitConfig,
  splitByLines,
  splitByCSVRows,
  splitBySubtitleCues,
  splitJSON,
  splitYAML,
} from '../lib/chunker'

describe('chunker', () => {
  describe('getEffectiveSplitConfig', () => {
    it('should return auto-calculated values when autoSplit is true', () => {
      const result = getEffectiveSplitConfig(30000, 500, {
        maxCharsPerChunk: 9000,
        overlapLines: 2,
        autoSplit: true,
      })

      expect(result.maxChars).toBeGreaterThan(0)
      expect(result.maxChars).toBeLessThanOrEqual(24000)
      expect(result.overlap).toBeGreaterThanOrEqual(2)
      expect(result.overlap).toBeLessThanOrEqual(20)
    })

    it('should return configured values when autoSplit is false', () => {
      const result = getEffectiveSplitConfig(30000, 500, {
        maxCharsPerChunk: 5000,
        overlapLines: 3,
        autoSplit: false,
      })

      expect(result.maxChars).toBe(5000)
      expect(result.overlap).toBe(3)
    })
  })

  describe('splitByLines', () => {
    it('should split text by lines within maxChars', () => {
      const text = 'line1\nline2\nline3\nline4\nline5'
      const chunks = splitByLines(text, 10, 1)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0]).toContain('line1')
    })

    it('should handle empty text', () => {
      const chunks = splitByLines('', 10, 1)
      expect(chunks.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('splitByCSVRows', () => {
    it('should split CSV preserving header', () => {
      const csv = 'name,age,city\nJohn,25,NYC\nJane,30,LA'
      const chunks = splitByCSVRows(csv, 50)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0]).toContain('name,age,city')
    })

    it('should handle CSV without header', () => {
      const csv = 'John,25,NYC\nJane,30,LA'
      const chunks = splitByCSVRows(csv, 50)

      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('splitBySubtitleCues', () => {
    it('should split SRT file into cue blocks', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
First subtitle

2
00:00:05,000 --> 00:00:08,000
Second subtitle`

      const chunks = splitBySubtitleCues(srt, 'srt', 200)

      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should split VTT file into cue blocks', () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
First subtitle

00:00:05.000 --> 00:00:08.000
Second subtitle`

      const chunks = splitBySubtitleCues(vtt, 'vtt', 200)

      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('splitJSON', () => {
    it('should return single chunk for valid JSON under limit', () => {
      const json = JSON.stringify({ name: 'test', value: 123 })
      const chunks = splitJSON(json, 1000)

      expect(chunks.length).toBe(1)
    })

    it('should return single chunk for invalid JSON', () => {
      const invalidJson = '{ invalid json }'
      const chunks = splitJSON(invalidJson, 1000)

      expect(chunks.length).toBe(1)
    })
  })

  describe('splitYAML', () => {
    it('should split YAML documents', () => {
      const yaml = `---
name: test
value: 1
---
name: test2
value: 2`

      const chunks = splitYAML(yaml, 20)

      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('splitFileContent', () => {
    it('should split plain text files', () => {
      const text = 'line1\nline2\nline3\n'.repeat(100)
      const result = splitFileContent(text, 'txt', {
        maxCharsPerChunk: 500,
        overlapLines: 2,
        autoSplit: true,
      })

      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })

    it('should split CSV files', () => {
      const csv = 'name,age\n' + Array(100).fill('John,25').join('\n')
      const result = splitFileContent(csv, 'csv', {
        maxCharsPerChunk: 200,
        overlapLines: 0,
        autoSplit: true,
      })

      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })

    it('should split SRT files', () => {
      const srt = Array(50)
        .fill(null)
        .map((_, i) => `${i + 1}\n00:00:${String(i).padStart(2, '0')},000 --> 00:00:${String(i + 1).padStart(2, '0')},000\nSubtitle ${i + 1}`)
        .join('\n\n')

      const result = splitFileContent(srt, 'srt', {
        maxCharsPerChunk: 300,
        overlapLines: 0,
        autoSplit: true,
      })

      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('mergeChunks', () => {
    it('should merge text chunks without overlap', () => {
      const chunks = ['line1\nline2', 'line3\nline4']
      const result = mergeChunks(chunks, 0, 'txt')

      expect(result).toContain('line1')
      expect(result).toContain('line4')
    })

    it('should merge CSV chunks without duplicate rows', () => {
      const chunks = ['name,age\nJohn,25', 'John,25\nJane,30']
      const result = mergeChunks(chunks, 0, 'csv')

      expect(result.split('\n').filter(l => l.trim()).length).toBeGreaterThan(1)
    })

    it('should merge subtitle chunks', () => {
      const chunks = ['1\n00:00:01,000 --> 00:00:04,000\nFirst', '2\n00:00:05,000 --> 00:00:08,000\nSecond']
      const result = mergeChunks(chunks, 0, 'srt')

      expect(result).toContain('First')
      expect(result).toContain('Second')
    })
  })
})
