import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { AppProvider, useApp } from '../contexts/AppContext'
import { OutputPanel } from '../components/OutputPanel'
import { PreviewModal } from '../components/PreviewModal'
import { RunPanel } from '../components/RunPanel'
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
  novelModeEnabled: false,
  refusalRecoveryEnabled: true,
  autoSplit: true,
  maxCharsPerChunk: 9000,
  overlapLines: 0,
  maxParallelChunks: 3,
  parallelMultiplier: 5,
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

function createRun(overrides: Partial<ActiveRun> = {}): ActiveRun {
  return {
    id: 'run-large',
    status: 'completed',
    file: {
      name: 'large.txt',
      format: 'txt',
      size: 1,
      lineCount: 1,
      content: 'original',
    },
    config: {
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      instruction: '',
      novelModeEnabled: false,
      refusalRecoveryEnabled: true,
      maxCharsPerChunk: 9000,
      overlapLines: 0,
      maxParallelChunks: 15,
      parallelMultiplier: 5,
      autoSplit: true,
    },
    chunks: [
      {
        index: 0,
        original: 'original',
        translatedCore: 'translated',
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

function createLargeText(prefix: string): string {
  return Array.from({ length: 100000 }, (_, index) => `${prefix} ${index + 1}`).join('\n')
}

function ProgressHarness() {
  const { dispatch } = useApp()

  useEffect(() => {
    dispatch({
      type: 'SET_PROGRESS',
      payload: {
        percent: 20,
        currentChunk: 0,
        totalChunks: 30,
        runningChunks: Array.from({ length: 15 }, (_, index) => index),
        completedChunks: 0,
        etaSeconds: 120,
      },
    })
    dispatch({ type: 'SET_IS_TRANSLATING', payload: true })
  }, [dispatch])

  return <RunPanel />
}

function LargePreviewHarness({
  originalText,
  translatedText,
  modal,
}: {
  originalText: string
  translatedText: string
  modal: boolean
}) {
  const { dispatch } = useApp()

  useEffect(() => {
    const run = createRun({
      file: {
        name: 'large.txt',
        format: 'txt',
        size: originalText.length,
        lineCount: 100000,
        content: originalText,
      },
      chunks: [
        {
          index: 0,
          original: originalText,
          translatedCore: translatedText,
          status: 'success',
          startTime: null,
          endTime: null,
          retryCount: 0,
          error: null,
          diagnostics: [],
          validationIssues: [],
        },
      ],
    })

    dispatch({ type: 'SET_FILE', payload: run.file })
    dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
    dispatch({ type: 'SET_TRANSLATION_OUTPUT', payload: translatedText })
  }, [dispatch, originalText, translatedText])

  return modal
    ? <PreviewModal open={true} onOpenChange={() => {}} />
    : <OutputPanel onExpandPreview={() => {}} />
}

describe('Large-file previews and run monitor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a bounded preview for very large output content', async () => {
    const originalText = createLargeText('Original line')
    const translatedText = createLargeText('Translated line')

    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(createSettings())
    )

    render(
      <AppProvider>
        <LargePreviewHarness
          originalText={originalText}
          translatedText={translatedText}
          modal={false}
        />
      </AppProvider>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Preview truncated for performance/)).toHaveLength(2)
    })
    const pageText = document.body.textContent || ''
    expect(pageText).toContain('Original line 1')
    expect(pageText).toContain('Original line 100000')
    expect(pageText).not.toContain('Original line 50000')
    expect(pageText).toContain('Translated line 1')
    expect(pageText).not.toContain('Translated line 50000')
  })

  it('uses the same bounded preview in the modal preview', async () => {
    const originalText = createLargeText('Original modal')
    const translatedText = createLargeText('Translated modal')

    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(createSettings())
    )

    render(
      <AppProvider>
        <LargePreviewHarness
          originalText={originalText}
          translatedText={translatedText}
          modal={true}
        />
      </AppProvider>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Preview truncated for performance/)).toHaveLength(2)
    })
    const pageText = document.body.textContent || ''
    expect(pageText).toContain('Original modal 1')
    expect(pageText).not.toContain('Original modal 50000')
    expect(pageText).toContain('Translated modal 100000')
  })

  it('shows effective parallelism and wave math from the multiplied run config', async () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(createSettings())
    )
    localStorage.setItem(
      STORAGE_KEYS.activeRun,
      JSON.stringify(
        createRun({
          status: 'running',
          totalChunks: 30,
          processedChunks: 0,
          progress: {
            percent: 0,
            elapsedSeconds: 0,
            averageChunkTime: null,
            etaSeconds: 120,
          },
        })
      )
    )

    render(
      <AppProvider>
        <ProgressHarness />
      </AppProvider>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/15 chunks/).length).toBeGreaterThanOrEqual(2)
    })
    expect(screen.getByText(/Wave 1\/2: Processing 15 chunks/)).toBeInTheDocument()
  })
})
