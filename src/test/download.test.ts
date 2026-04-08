import { describe, it, expect } from 'vitest'
import {
  generateTranslatedFilename,
  getLanguageSuffix,
  downloadSingleFile,
  copyToClipboard,
} from '../lib/download'

describe('download', () => {
  describe('generateTranslatedFilename', () => {
    it('should generate filename with English suffix', () => {
      const result = generateTranslatedFilename('document.txt', 'en')
      expect(result).toBe('document-english.txt')
    })

    it('should generate filename with Indonesian suffix', () => {
      const result = generateTranslatedFilename('document.txt', 'id')
      expect(result).toBe('document-indonesia.txt')
    })

    it('should generate filename with Japanese suffix', () => {
      const result = generateTranslatedFilename('document.txt', 'ja')
      expect(result).toBe('document-japanese.txt')
    })

    it('should generate filename with custom language', () => {
      const result = generateTranslatedFilename('document.txt', 'klingon')
      expect(result).toBe('document-klingon.txt')
    })

    it('should handle file without extension', () => {
      const result = generateTranslatedFilename('document', 'en')
      expect(result).toBe('document-english.document')
    })
  })

  describe('getLanguageSuffix', () => {
    it('should return correct suffix for common languages', () => {
      expect(getLanguageSuffix('en')).toBe('english')
      expect(getLanguageSuffix('id')).toBe('indonesia')
      expect(getLanguageSuffix('ja')).toBe('japanese')
      expect(getLanguageSuffix('zh')).toBe('chinese')
      expect(getLanguageSuffix('ko')).toBe('korean')
      expect(getLanguageSuffix('es')).toBe('spanish')
      expect(getLanguageSuffix('fr')).toBe('french')
      expect(getLanguageSuffix('de')).toBe('german')
    })

    it('should return lowercase version for unknown languages', () => {
      expect(getLanguageSuffix('xyz')).toBe('xyz')
    })

    it('should handle auto-detect', () => {
      expect(getLanguageSuffix('auto')).toBe('auto-detected')
    })
  })

  describe('downloadSingleFile', () => {
    it('should be defined', () => {
      expect(downloadSingleFile).toBeDefined()
    })
  })
})
