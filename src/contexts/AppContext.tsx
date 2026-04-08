import { createContext, useContext, useReducer, useRef, ReactNode, useCallback } from 'react'
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
import { startTranslation, pauseTranslation, cancelTranslation, discardActiveRun as discardRun } from '../lib/translate'
import { loadSettings, saveSettings, loadActiveRun, saveActiveRun, getSessionLogs, addSessionLog } from '../lib/storage'

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
  | { type: 'SET_PROGRESS'; payload: { percent: number; currentChunk: number; totalChunks: number } }
  | { type: 'UPDATE_CHUNK'; payload: { index: number; chunk: ChunkRecord } }
  | { type: 'SET_LOGS'; payload: LogEntry[] }
  | { type: 'RESET' }

function loadInitialState(): AppState {
  const settings = loadSettings()
  const activeRun = loadActiveRun()
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
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] }
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
  },
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  actions: {
    startTranslation: () => Promise<void>
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
              addSessionLog('Chunk ' + (index + 1) + ' started', 'info')
            },
            onChunkComplete: (index, _result) => {
              addSessionLog('Chunk ' + (index + 1) + ' completed', 'info')
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
                },
              })
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
        payload: { percent: 0, currentChunk: 0, totalChunks: 0 },
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
  }
}
