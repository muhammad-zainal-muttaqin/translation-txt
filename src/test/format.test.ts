import { describe, it, expect } from 'vitest'
import {
  detectFormat,
  isLineOriented,
  isStructured,
  isSubtitle,
  getFormatLabel,
  parseSRTimestamp,
  parseVTTTimestamp,
  formatTimestampSRT,
  formatTimestampVTT,
  countCSVRows,
  getCSVHeader,
  validateJSONStructure,
  validateXMLStructure,
} from '../lib/format'

describe('format', () => {
  describe('detectFormat', () => {
    it('should detect txt extension', () => {
      expect(detectFormat('test.txt', 'content')).toBe('txt')
    })

    it('should detect csv extension', () => {
      expect(detectFormat('test.csv', 'content')).toBe('csv')
    })

    it('should detect md extension', () => {
      expect(detectFormat('test.md', 'content')).toBe('md')
      expect(detectFormat('test.markdown', 'content')).toBe('md')
    })

    it('should detect json extension', () => {
      expect(detectFormat('test.json', '{"key": "value"}')).toBe('json')
    })

    it('should detect srt extension', () => {
      expect(detectFormat('test.srt', 'content')).toBe('srt')
    })

    it('should detect vtt extension', () => {
      expect(detectFormat('test.vtt', 'content')).toBe('vtt')
    })

    it('should detect xml extension', () => {
      expect(detectFormat('test.xml', 'content')).toBe('xml')
    })

    it('should detect yaml extension', () => {
      expect(detectFormat('test.yaml', 'content')).toBe('yaml')
      expect(detectFormat('test.yml', 'content')).toBe('yml')
    })

    it('should detect VTT from content when no extension', () => {
      expect(detectFormat('test', 'WEBVTT')).toBe('vtt')
    })

    it('should detect XML from content when no extension', () => {
      expect(detectFormat('test', '<?xml version="1.0"?>')).toBe('xml')
    })
  })

  describe('isLineOriented', () => {
    it('should return true for txt, md, log, srt, vtt', () => {
      expect(isLineOriented('txt')).toBe(true)
      expect(isLineOriented('md')).toBe(true)
      expect(isLineOriented('log')).toBe(true)
      expect(isLineOriented('srt')).toBe(true)
      expect(isLineOriented('vtt')).toBe(true)
    })

    it('should return false for csv, json, xml, yaml', () => {
      expect(isLineOriented('csv')).toBe(false)
      expect(isLineOriented('json')).toBe(false)
      expect(isLineOriented('xml')).toBe(false)
      expect(isLineOriented('yaml')).toBe(false)
    })
  })

  describe('isStructured', () => {
    it('should return true for csv, json, xml, yaml, yml', () => {
      expect(isStructured('csv')).toBe(true)
      expect(isStructured('json')).toBe(true)
      expect(isStructured('xml')).toBe(true)
      expect(isStructured('yaml')).toBe(true)
      expect(isStructured('yml')).toBe(true)
    })

    it('should return false for txt, md, log, srt, vtt', () => {
      expect(isStructured('txt')).toBe(false)
      expect(isStructured('md')).toBe(false)
      expect(isStructured('log')).toBe(false)
      expect(isStructured('srt')).toBe(false)
      expect(isStructured('vtt')).toBe(false)
    })
  })

  describe('isSubtitle', () => {
    it('should return true for srt and vtt', () => {
      expect(isSubtitle('srt')).toBe(true)
      expect(isSubtitle('vtt')).toBe(true)
    })

    it('should return false for other formats', () => {
      expect(isSubtitle('txt')).toBe(false)
      expect(isSubtitle('csv')).toBe(false)
      expect(isSubtitle('json')).toBe(false)
    })
  })

  describe('getFormatLabel', () => {
    it('should return correct labels', () => {
      expect(getFormatLabel('txt')).toBe('Plain text')
      expect(getFormatLabel('csv')).toBe('CSV')
      expect(getFormatLabel('md')).toBe('Markdown')
      expect(getFormatLabel('json')).toBe('JSON')
      expect(getFormatLabel('srt')).toBe('SubRip subtitles')
      expect(getFormatLabel('vtt')).toBe('WebVTT subtitles')
      expect(getFormatLabel('xml')).toBe('XML')
      expect(getFormatLabel('yaml')).toBe('YAML')
    })
  })

  describe('parseSRTimestamp', () => {
    it('should parse SRT timestamp', () => {
      expect(parseSRTimestamp('00:01:23,456')).toBe(83000 + 456)
    })

    it('should return 0 for invalid timestamp', () => {
      expect(parseSRTimestamp('invalid')).toBe(0)
    })
  })

  describe('parseVTTimestamp', () => {
    it('should parse VTT timestamp', () => {
      expect(parseVTTTimestamp('00:01:23.456')).toBe(83000 + 456)
    })

    it('should handle hour format', () => {
      expect(parseVTTTimestamp('01:02:03.456')).toBe(3600000 + 120000 + 3000 + 456)
    })
  })

  describe('formatTimestampSRT', () => {
    it('should format milliseconds to SRT timestamp', () => {
      expect(formatTimestampSRT(83000 + 456)).toBe('00:01:23,456')
    })

    it('should handle hours', () => {
      expect(formatTimestampSRT(3600000 + 120000 + 3000 + 456)).toBe('01:02:03,456')
    })
  })

  describe('formatTimestampVTT', () => {
    it('should format milliseconds to VTT timestamp', () => {
      expect(formatTimestampVTT(83000 + 456)).toBe('00:01:23.456')
    })
  })

  describe('countCSVRows', () => {
    it('should count CSV rows excluding empty lines', () => {
      const csv = 'name,age\nJohn,25\n\nJane,30\n'
      expect(countCSVRows(csv)).toBe(3)
    })
  })

  describe('getCSVHeader', () => {
    it('should extract CSV header', () => {
      const csv = 'name,age,city\nJohn,25,NYC'
      expect(getCSVHeader(csv)).toEqual(['name', 'age', 'city'])
    })

    it('should return empty array for empty CSV', () => {
      expect(getCSVHeader('')).toEqual([])
    })

    it('should handle quoted fields', () => {
      const csv = '"Name","Age","City"'
      const header = getCSVHeader(csv)
      expect(header).toEqual(['Name', 'Age', 'City'])
    })
  })

  describe('validateJSONStructure', () => {
    it('should return true for valid JSON', () => {
      expect(validateJSONStructure('{"key": "value"}')).toBe(true)
      expect(validateJSONStructure('[1, 2, 3]')).toBe(true)
    })

    it('should return false for invalid JSON', () => {
      expect(validateJSONStructure('{invalid}')).toBe(false)
      expect(validateJSONStructure('')).toBe(false)
    })
  })

  describe('validateXMLStructure', () => {
    it('should return true for valid XML', () => {
      expect(validateXMLStructure('<root><item>text</item></root>')).toBe(true)
    })

    it('should return false for invalid XML', () => {
      expect(validateXMLStructure('<root><item>text</root>')).toBe(false)
    })
  })
})
