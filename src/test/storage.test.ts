import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadSettings,
  saveSettings,
  loadActiveRun,
  saveActiveRun,
  saveProviderProfile,
  deleteProviderProfile,
  generateRunId,
  clearSessionLogs,
} from '../lib/storage'
import type { Settings, ActiveRun, SavedProviderProfile } from '../types'

const mockLocalStorage: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockLocalStorage[key] = value
  },
  removeItem: (key: string) => {
    delete mockLocalStorage[key]
  },
  clear: () => {
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
  },
})

describe('storage', () => {
  beforeEach(() => {
    mockLocalStorage['translationtxt.settings.v1'] = JSON.stringify({
      version: 1,
      migrationVersion: 1,
      rememberedDraft: null,
      savedProfiles: [],
    })
  })

  describe('loadSettings', () => {
    it('should load settings from localStorage', () => {
      const settings = loadSettings()
      expect(settings.version).toBe(1)
      expect(settings.savedProfiles).toEqual([])
    })

    it('should return default settings if not found', () => {
      delete mockLocalStorage['translationtxt.settings.v1']
      const settings = loadSettings()
      expect(settings.version).toBe(1)
      expect(settings.savedProfiles).toEqual([])
    })
  })

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      const settings: Settings = {
        version: 1,
        migrationVersion: 1,
        rememberedDraft: null,
        savedProfiles: [],
      }
      saveSettings(settings)
      expect(mockLocalStorage['translationtxt.settings.v1']).toBeDefined()
    })
  })

  describe('loadActiveRun', () => {
    it('should load active run from localStorage', () => {
      const run: ActiveRun = {
        id: 'test-run',
        status: 'running',
        file: {
          name: 'test.txt',
          format: 'txt',
          size: 100,
          lineCount: 10,
          content: 'test',
        },
        config: {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          instruction: '',
          novelModeEnabled: false,
          refusalRecoveryEnabled: false,
          maxCharsPerChunk: 9000,
          overlapLines: 2,
          maxParallelChunks: 3,
          parallelMultiplier: 1,
          autoSplit: true,
        },
        chunks: [],
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: null,
        totalChunks: 0,
        processedChunks: 0,
        finalValidationIssues: [],
        novelContext: null,
        progress: {
          percent: 0,
          elapsedSeconds: 0,
          averageChunkTime: null,
          etaSeconds: null,
        },
      }
      mockLocalStorage['translationtxt.active-run.v1'] = JSON.stringify(run)

      const loadedRun = loadActiveRun()
      expect(loadedRun?.id).toBe('test-run')
      expect(loadedRun?.status).toBe('running')
    })

    it('should return null if no run found', () => {
      delete mockLocalStorage['translationtxt.active-run.v1']
      const run = loadActiveRun()
      expect(run).toBeNull()
    })
  })

  describe('saveActiveRun', () => {
    it('should save active run to localStorage', () => {
      const run: ActiveRun = {
        id: 'test-run',
        status: 'completed',
        file: {
          name: 'test.txt',
          format: 'txt',
          size: 100,
          lineCount: 10,
          content: 'test',
        },
        config: {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          instruction: '',
          novelModeEnabled: false,
          refusalRecoveryEnabled: false,
          maxCharsPerChunk: 9000,
          overlapLines: 2,
          maxParallelChunks: 3,
          parallelMultiplier: 1,
          autoSplit: true,
        },
        chunks: [],
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: Date.now(),
        totalChunks: 1,
        processedChunks: 1,
        finalValidationIssues: [],
        novelContext: null,
        progress: {
          percent: 100,
          elapsedSeconds: 10,
          averageChunkTime: 10,
          etaSeconds: 0,
        },
      }

      saveActiveRun(run)
      expect(mockLocalStorage['translationtxt.active-run.v1']).toBeDefined()
    })

    it('should remove run when null is passed', () => {
      mockLocalStorage['translationtxt.active-run.v1'] = JSON.stringify({ id: 'test' })
      saveActiveRun(null)
      expect(mockLocalStorage['translationtxt.active-run.v1']).toBeUndefined()
    })
  })

  describe('saveProviderProfile', () => {
    it('should add new profile', () => {
      const settings: Settings = {
        version: 1,
        migrationVersion: 1,
        rememberedDraft: null,
        savedProfiles: [],
      }

      const profile: SavedProviderProfile = {
        id: 'profile-1',
        name: 'My Profile',
        protocol: 'openai-compatible',
        endpointUrl: 'https://api.example.com',
        model: 'gpt-4',
        apiKey: 'sk-test',
        extraHeadersJson: '',
        anthropicVersion: '',
      }

      const updated = saveProviderProfile(profile, settings)
      expect(updated.savedProfiles).toHaveLength(1)
      expect(updated.savedProfiles[0].name).toBe('My Profile')
    })

    it('should update existing profile', () => {
      const settings: Settings = {
        version: 1,
        migrationVersion: 1,
        rememberedDraft: null,
        savedProfiles: [
          {
            id: 'profile-1',
            name: 'Old Name',
            protocol: 'openai-compatible',
            endpointUrl: 'https://api.example.com',
            model: 'gpt-4',
            apiKey: '',
            extraHeadersJson: '',
            anthropicVersion: '',
          },
        ],
      }

      const profile: SavedProviderProfile = {
        id: 'profile-1',
        name: 'New Name',
        protocol: 'openai-compatible',
        endpointUrl: 'https://api.example.com',
        model: 'gpt-4',
        apiKey: '',
        extraHeadersJson: '',
        anthropicVersion: '',
      }

      const updated = saveProviderProfile(profile, settings)
      expect(updated.savedProfiles).toHaveLength(1)
      expect(updated.savedProfiles[0].name).toBe('New Name')
    })
  })

  describe('deleteProviderProfile', () => {
    it('should remove profile by id', () => {
      const settings: Settings = {
        version: 1,
        migrationVersion: 1,
        rememberedDraft: null,
        savedProfiles: [
          { id: 'profile-1', name: 'Profile 1', protocol: 'openai-compatible', endpointUrl: '', model: '', apiKey: '', extraHeadersJson: '', anthropicVersion: '' },
          { id: 'profile-2', name: 'Profile 2', protocol: 'openai-compatible', endpointUrl: '', model: '', apiKey: '', extraHeadersJson: '', anthropicVersion: '' },
        ],
      }

      const updated = deleteProviderProfile('profile-1', settings)
      expect(updated.savedProfiles).toHaveLength(1)
      expect(updated.savedProfiles[0].id).toBe('profile-2')
    })
  })

  describe('generateRunId', () => {
    it('should generate unique run IDs', () => {
      const id1 = generateRunId()
      const id2 = generateRunId()
      expect(id1).toMatch(/^run_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('clearSessionLogs', () => {
    it('should clear session logs', () => {
      mockLocalStorage['translationtxt.session.v1'] = JSON.stringify([
        { timestamp: Date.now(), level: 'info', message: 'test' },
      ])
      clearSessionLogs()
      expect(mockLocalStorage['translationtxt.session.v1']).toBeUndefined()
    })
  })
})
