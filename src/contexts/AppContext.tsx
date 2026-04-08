import { createContext, useContext, useReducer, ReactNode } from 'react'
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
  | { type: 'RESET' }

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
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload }
    case 'RESET':
      return { ...initialState, settings: state.settings }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
