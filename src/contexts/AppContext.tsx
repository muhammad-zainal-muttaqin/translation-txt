import { createContext, useContext, useReducer, useRef, ReactNode, useCallback, useEffect } from 'react'
import type {
  Settings,
  DraftSettings,
  FileState,
  ChunkConfig,
  ActiveRun,
  WorkspacePanelId,
  LogEntry,
  ValidationIssue,
  ChunkRecord,
} from '../types'
import { DEFAULT_INSTRUCTION } from '../types'
import { startTranslation, pauseTranslation, cancelTranslation, discardActiveRun as discardRun, resumeTranslation } from '../lib/translate'
import { loadSettings, loadActiveRun, saveActiveRun, getSessionLogs, addSessionLog, normalizeRunOnLoad, subscribeToSessionLogs } from '../lib/storage'

interface AppState {
  settings: Settings
  draft: DraftSettings | null
  file: FileState | null
  chunkConfig: ChunkConfig | null
  originalChunks: string[]
  translatedChunks: string[]
  translationOutput: string
  filePreflightIssues: ValidationIssue[]
  finalValidationIssues: ValidationIssue[]
  isTranslating: boolean
  activeRun: ActiveRun | null
  activePanel: WorkspacePanelId
  logs: LogEntry[]
  progress: {
    percent: number
    currentChunk: number
    totalChunks: number
    runningChunks: number[]
    completedChunks: number
    etaSeconds: number | null
  }
}

type AppAction =
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_DRAFT'; payload: DraftSettings | null }
  | { type: 'SET_FILE'; payload: FileState | null }
  | { type: 'SET_CHUNK_CONFIG'; payload: ChunkConfig | null }
  | { type: 'SET_ORIGINAL_CHUNKS'; payload: string[] }
  | { type: 'SET_TRANSLATED_CHUNKS'; payload: string[] }
  | { type: 'SET_TRANSLATION_OUTPUT'; payload: string }
  | { type: 'SET_FILE_PREFLIGHT_ISSUES'; payload: ValidationIssue[] }
  | { type: 'SET_FINAL_VALIDATION_ISSUES'; payload: ValidationIssue[] }
  | { type: 'SET_IS_TRANSLATING'; payload: boolean }
  | { type: 'SET_ACTIVE_RUN'; payload: ActiveRun | null }
  | { type: 'SET_ACTIVE_PANEL'; payload: WorkspacePanelId }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'SET_PROGRESS'; payload: { percent: number; currentChunk: number; totalChunks: number; runningChunks: number[]; completedChunks: number; etaSeconds: number | null } }
  | { type: 'UPDATE_CHUNK'; payload: { index: number; chunk: ChunkRecord } }
  | { type: 'SET_LOGS'; payload: LogEntry[] }
  | { type: 'RESET' }

function loadInitialState(): AppState {
  const settings = loadSettings()
  // Migration: bump previously-saved drafts that still carry an old low cap
  // (or are missing the field) to 65536 — needed because there's no UI yet to
  // edit maxOutputTokens, and modern models (Kimi K2.5, etc.) support 200k+
  // output tokens but emit lots of reasoning/thinking that count toward the cap.
  if (settings.rememberedDraft && (!settings.rememberedDraft.maxOutputTokens || settings.rememberedDraft.maxOutputTokens < 65536)) {
    settings.rememberedDraft = { ...settings.rememberedDraft, maxOutputTokens: 65536 }
  }
  const rawRun = loadActiveRun()
  const activeRun = rawRun ? normalizeRunOnLoad(rawRun) : null
  if (activeRun && rawRun && activeRun.status !== rawRun.status) {
    saveActiveRun(activeRun)
  }
  const logs = getSessionLogs()

  return {
    settings,
    draft: settings.rememberedDraft,
    file: activeRun?.file || null,
    chunkConfig: activeRun?.config || null,
    originalChunks: activeRun?.chunks.map(c => c.original) || [],
    translatedChunks: activeRun?.chunks.map(c => c.translatedCore) || [],
    translationOutput: '',
    filePreflightIssues: [],
    finalValidationIssues: activeRun?.finalValidationIssues || [],
    isTranslating: false,
    activeRun,
    activePanel: 'file',
    logs,
    progress: {
      percent: activeRun?.progress.percent || 0,
      currentChunk: activeRun?.processedChunks || 0,
      totalChunks: activeRun?.totalChunks || 0,
      runningChunks: [],
      completedChunks: activeRun?.processedChunks || 0,
      etaSeconds: activeRun?.progress.etaSeconds || null,
    },
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload }
    case 'SET_DRAFT':
      return { ...state, draft: action.payload }
    case 'SET_FILE':
      return { ...state, file: action.payload }
    case 'SET_CHUNK_CONFIG':
      return { ...state, chunkConfig: action.payload }
    case 'SET_ORIGINAL_CHUNKS':
      return { ...state, originalChunks: action.payload }
    case 'SET_TRANSLATED_CHUNKS':
      return { ...state, translatedChunks: action.payload }
    case 'SET_TRANSLATION_OUTPUT':
      return { ...state, translationOutput: action.payload }
    case 'SET_FILE_PREFLIGHT_ISSUES':
      return { ...state, filePreflightIssues: action.payload }
    case 'SET_FINAL_VALIDATION_ISSUES':
      return { ...state, finalValidationIssues: action.payload }
    case 'SET_IS_TRANSLATING':
      return { ...state, isTranslating: action.payload }
    case 'SET_ACTIVE_RUN':
      return { ...state, activeRun: action.payload }
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.payload }
    case 'ADD_LOG': {
      const next = [...state.logs, action.payload]
      return { ...state, logs: next.length > 500 ? next.slice(-500) : next }
    }
    case 'SET_LOGS':
      return { ...state, logs: action.payload }
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload }
    case 'RESET':
      return { ...initialState, settings: state.settings }
    default:
      return state
  }
}

const initialState: AppState = {
  settings: {
    version: 1,
    migrationVersion: 1,
    rememberedDraft: null,
    savedProfiles: [],
  },
  draft: null,
  file: null,
  chunkConfig: null,
  originalChunks: [],
  translatedChunks: [],
  translationOutput: '',
  filePreflightIssues: [],
  finalValidationIssues: [],
  isTranslating: false,
  activeRun: null,
  activePanel: 'file',
  logs: [],
  progress: {
    percent: 0,
    currentChunk: 0,
    totalChunks: 0,
    runningChunks: [],
    completedChunks: 0,
    etaSeconds: null,
  },
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  actions: {
    startTranslation: () => Promise<void>
    resumeTranslation: () => Promise<void>
    pauseTranslation: () => void
    cancelTranslation: () => void
    discardActiveRun: () => void
    clearWorkspace: () => void
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, loadInitialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return subscribeToSessionLogs((entry) => {
      dispatch({ type: 'ADD_LOG', payload: entry })
    })
  }, [])

  const actions = {
    startTranslation: useCallback(async () => {
      if (!state.file || !state.draft) {
        addSessionLog('File or draft not configured', 'error')
        return
      }

      abortControllerRef.current = new AbortController()
      dispatch({ type: 'SET_IS_TRANSLATING', payload: true })

      try {
        await startTranslation(
          {
            file: state.file,
            draft: state.draft,
            abortSignal: abortControllerRef.current.signal,
          },
          {
            onChunkStart: (index) => {
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onChunkComplete: (index, _result) => {
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onChunkError: (index, error) => {
              addSessionLog('Chunk ' + (index + 1) + ' error: ' + error, 'error')
            },
            onProgress: (progress) => {
              dispatch({
                type: 'SET_PROGRESS',
                payload: {
                  percent: progress.percent,
                  currentChunk: progress.currentChunk,
                  totalChunks: progress.totalChunks,
                  runningChunks: progress.runningChunks,
                  completedChunks: progress.completedChunks,
                  etaSeconds: progress.etaSeconds,
                },
              })
            },
            onWaveStart: (waveIndex, chunkIndices) => {
              addSessionLog(`Wave ${waveIndex}: Processing chunks ${chunkIndices.map(i => i + 1).join(', ')}`, 'info')
              dispatch({
                type: 'SET_PROGRESS',
                payload: {
                  ...state.progress,
                  runningChunks: chunkIndices,
                },
              })
            },
            onWaveComplete: (waveIndex) => {
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onComplete: (output) => {
              dispatch({ type: 'SET_TRANSLATION_OUTPUT', payload: output })
              addSessionLog('Translation completed', 'info')
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onError: (error) => {
              addSessionLog('Translation error: ' + error, 'error')
            },
          }
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        addSessionLog('Translation failed: ' + errorMsg, 'error')
      } finally {
        dispatch({ type: 'SET_IS_TRANSLATING', payload: false })
        abortControllerRef.current = null
      }
    }, [state.file, state.draft]),

    resumeTranslation: useCallback(async () => {
      if (!state.activeRun || !state.draft) {
        addSessionLog('No paused run or draft to resume', 'error')
        return
      }

      abortControllerRef.current = new AbortController()
      dispatch({ type: 'SET_IS_TRANSLATING', payload: true })

      try {
        await resumeTranslation(
          {
            run: state.activeRun,
            draft: state.draft,
            abortSignal: abortControllerRef.current.signal,
          },
          {
            onChunkStart: (_index) => {
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onChunkComplete: (_index, _result) => {
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onChunkError: (_index, _error) => {},
            onProgress: (progress) => {
              dispatch({
                type: 'SET_PROGRESS',
                payload: {
                  percent: progress.percent,
                  currentChunk: progress.currentChunk,
                  totalChunks: progress.totalChunks,
                  runningChunks: progress.runningChunks,
                  completedChunks: progress.completedChunks,
                  etaSeconds: progress.etaSeconds,
                },
              })
            },
            onWaveStart: (waveIndex, chunkIndices) => {
              addSessionLog(`Wave ${waveIndex}: Resuming chunks ${chunkIndices.map(i => i + 1).join(', ')}`, 'info')
              dispatch({
                type: 'SET_PROGRESS',
                payload: {
                  ...state.progress,
                  runningChunks: chunkIndices,
                },
              })
            },
            onWaveComplete: (waveIndex) => {
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onComplete: (output) => {
              dispatch({ type: 'SET_TRANSLATION_OUTPUT', payload: output })
              const run = loadActiveRun()
              if (run) {
                dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
              }
            },
            onError: (error) => {
              addSessionLog('Translation error: ' + error, 'error')
            },
          }
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        addSessionLog('Resume failed: ' + errorMsg, 'error')
      } finally {
        dispatch({ type: 'SET_IS_TRANSLATING', payload: false })
        abortControllerRef.current = null
        const run = loadActiveRun()
        if (run) {
          dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
        }
      }
    }, [state.activeRun, state.draft]),

    pauseTranslation: useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      pauseTranslation()
      dispatch({ type: 'SET_IS_TRANSLATING', payload: false })
      const run = loadActiveRun()
      if (run) {
        dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
      }
    }, []),

    cancelTranslation: useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      cancelTranslation()
      dispatch({ type: 'SET_IS_TRANSLATING', payload: false })
      const run = loadActiveRun()
      if (run) {
        dispatch({ type: 'SET_ACTIVE_RUN', payload: run })
      }
    }, []),

    discardActiveRun: useCallback(() => {
      discardRun()
      dispatch({ type: 'SET_ACTIVE_RUN', payload: null })
      dispatch({
        type: 'SET_PROGRESS',
        payload: { percent: 0, currentChunk: 0, totalChunks: 0, runningChunks: [], completedChunks: 0, etaSeconds: null },
      })
      addSessionLog('Active run discarded', 'info')
    }, []),

    clearWorkspace: useCallback(() => {
      discardRun()
      dispatch({ type: 'RESET' })
      addSessionLog('Workspace cleared', 'info')
    }, []),
  }

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export function getDefaultDraft(): DraftSettings {
  return {
    providerProtocol: 'openai-compatible',
    providerPreset: 'openrouter',
    endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
    model: '',
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
    customInstruction: DEFAULT_INSTRUCTION,
    novelModeEnabled: true,
    refusalRecoveryEnabled: true,
    autoSplit: true,
    maxCharsPerChunk: 9000,
    overlapLines: 2,
    maxParallelChunks: 3,
    parallelMultiplier: 1, // Default 1x (3 parallel chunks)
    maxOutputTokens: 65536,
  }
}
