import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppProvider, useApp } from '../contexts/AppContext'
import type { ActiveRun, DraftSettings, Settings } from '../types'
import { STORAGE_KEYS } from '../types'

const baseDraft: DraftSettings = {
  providerProtocol: 'openai-compatible',
  providerPreset: 'openrouter',
  endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'test-model',
  apiKey: '',
  rememberOnDevice: false,
  extraHeadersJson: '',
  anthropicVersion: '2023-06-01',
  profileName: '',
  sourceLanguage: 'auto',
  sourceLanguageCustom: '',
  targetLanguage: 'en',
  targetLanguageCustom: '',
  useDefaultInstruction: true,
  customInstruction: 'Translate all text.',
  novelModeEnabled: true,
  refusalRecoveryEnabled: true,
  autoSplit: true,
  maxCharsPerChunk: 9000,
  overlapLines: 0,
  maxParallelChunks: 3,
  parallelMultiplier: 1,
  maxOutputTokens: 65536,
}

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    version: 1,
    migrationVersion: 1,
    rememberedDraft: baseDraft,
    savedProfiles: [],
    ...overrides,
  }
}

function createCompletedRun(overrides: Partial<ActiveRun> = {}): ActiveRun {
  return {
    id: 'run-1',
    status: 'completed',
    file: {
      name: 'story.txt',
      format: 'txt',
      size: 12,
      lineCount: 2,
      content: 'Hello\nWorld',
    },
    config: {
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      instruction: '',
      novelModeEnabled: false,
      refusalRecoveryEnabled: true,
      maxCharsPerChunk: 9000,
      overlapLines: 0,
      maxParallelChunks: 3,
      parallelMultiplier: 1,
      autoSplit: true,
    },
    chunks: [
      {
        index: 0,
        original: 'Hello\nWorld',
        translatedCore: 'Halo\nDunia',
        status: 'success',
        startTime: null,
        endTime: null,
        retryCount: 0,
        error: null,
        diagnostics: [],
        validationIssues: [],
      },
    ],
    createdAt: 1,
    startedAt: 2,
    completedAt: 3,
    totalChunks: 1,
    processedChunks: 1,
    finalValidationIssues: [],
    novelContext: null,
    progress: {
      percent: 100,
      elapsedSeconds: 1,
      averageChunkTime: 1,
      etaSeconds: 0,
    },
    ...overrides,
  }
}

function StateProbe() {
  const { state, dispatch } = useApp()

  return (
    <div>
      <div data-testid="translation-output">{state.translationOutput}</div>
      <button
        onClick={() =>
          dispatch({
            type: 'SET_DRAFT',
            payload: {
              ...state.draft,
              endpointUrl: 'https://persisted.example/v1',
              apiKey: 'transient-key',
              rememberOnDevice: false,
            },
          })
        }
      >
        save-without-key
      </button>
      <button
        onClick={() =>
          dispatch({
            type: 'SET_DRAFT',
            payload: {
              ...state.draft,
              endpointUrl: 'https://persisted.example/v1',
              apiKey: 'remembered-key',
              rememberOnDevice: true,
            },
          })
        }
      >
        save-with-key
      </button>
    </div>
  )
}

describe('App context persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('restores completed translation output from a persisted run', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(createSettings())
    )
    localStorage.setItem(
      STORAGE_KEYS.activeRun,
      JSON.stringify(createCompletedRun())
    )

    render(
      <AppProvider>
        <StateProbe />
      </AppProvider>
    )

    expect(screen.getByTestId('translation-output')).toHaveTextContent('Halo Dunia')
  })

  it('persists draft changes while stripping api keys unless rememberOnDevice is enabled', async () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(createSettings())
    )

    render(
      <AppProvider>
        <StateProbe />
      </AppProvider>
    )

    fireEvent.click(screen.getByText('save-without-key'))

    await waitFor(() => {
      const savedSettings = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.settings) || '{}'
      ) as Settings
      expect(savedSettings.rememberedDraft?.endpointUrl).toBe('https://persisted.example/v1')
      expect(savedSettings.rememberedDraft?.apiKey).toBe('')
      expect(savedSettings.rememberedDraft?.rememberOnDevice).toBe(false)
    })

    fireEvent.click(screen.getByText('save-with-key'))

    await waitFor(() => {
      const savedSettings = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.settings) || '{}'
      ) as Settings
      expect(savedSettings.rememberedDraft?.apiKey).toBe('remembered-key')
      expect(savedSettings.rememberedDraft?.rememberOnDevice).toBe(true)
    })
  })
})
