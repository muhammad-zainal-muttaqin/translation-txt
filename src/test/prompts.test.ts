import { describe, it, expect } from 'vitest'
import {
  buildTranslationPrompt,
  buildNovelContextPrompt,
} from '../lib/prompts'

describe('prompts', () => {
  describe('buildTranslationPrompt', () => {
    it('should build prompt with default instruction', () => {
      const prompt = buildTranslationPrompt('Hello world', 'txt', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction: '',
        useDefaultInstruction: true,
      })

      expect(prompt).toContain('Translate the following text')
      expect(prompt).toContain('English')
      expect(prompt).toContain('Japanese')
      expect(prompt).toContain('TXT')
    })

    it('should build prompt with custom instruction', () => {
      const customInstruction = 'Use formal language'
      const prompt = buildTranslationPrompt('Hello world', 'txt', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction,
        useDefaultInstruction: false,
      })

      expect(prompt).toContain('Use formal language')
    })

    it('should include format-specific rules for CSV', () => {
      const prompt = buildTranslationPrompt('name,age', 'csv', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction: '',
        useDefaultInstruction: true,
      })

      expect(prompt).toContain('CSV')
      expect(prompt).toContain('Preserve ALL commas')
    })

    it('should include format-specific rules for JSON', () => {
      const prompt = buildTranslationPrompt('{"key": "value"}', 'json', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction: '',
        useDefaultInstruction: true,
      })

      expect(prompt).toContain('JSON')
      expect(prompt).toContain('Keep ALL JSON syntax')
    })

    it('should include format-specific rules for SRT', () => {
      const prompt = buildTranslationPrompt('1\n00:00:01,000 --> 00:00:04,000\nSubtitle', 'srt', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction: '',
        useDefaultInstruction: true,
      })

      expect(prompt).toContain('SUBRIP')
      expect(prompt).toContain('timestamp formats')
    })

    it('should include format-specific rules for VTT', () => {
      const prompt = buildTranslationPrompt('WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nSubtitle', 'vtt', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction: '',
        useDefaultInstruction: true,
      })

      expect(prompt).toContain('WEBVTT')
      expect(prompt).toContain('timestamp formats')
    })

    it('should include format-specific rules for XML', () => {
      const prompt = buildTranslationPrompt('<root><item>text</item></root>', 'xml', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction: '',
        useDefaultInstruction: true,
      })

      expect(prompt).toContain('XML')
      expect(prompt).toContain('Keep ALL XML tags')
    })

    it('should include format-specific rules for YAML', () => {
      const prompt = buildTranslationPrompt('key: value', 'yaml', {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        customInstruction: '',
        useDefaultInstruction: true,
      })

      expect(prompt).toContain('YAML')
      expect(prompt).toContain('Keep ALL YAML syntax')
    })
  })

  describe('buildNovelContextPrompt', () => {
    it('should build novel context extraction prompt', () => {
      const prompt = buildNovelContextPrompt('Chapter 1: The Beginning...', 'ja')

      expect(prompt).toContain('analyzing a fictional narrative')
      expect(prompt).toContain('characters')
      expect(prompt).toContain('JSON format')
    })
  })
})
