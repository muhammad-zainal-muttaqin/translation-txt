export interface DraftSettings {
  providerProtocol: string;
  providerPreset: string;
  endpointUrl: string;
  model: string;
  apiKey: string;
  rememberOnDevice: boolean;
  extraHeadersJson: string;
  anthropicVersion: string;
  profileName: string;
  sourceLanguage: string;
  sourceLanguageCustom: string;
  targetLanguage: string;
  targetLanguageCustom: string;
  useDefaultInstruction: boolean;
  customInstruction: string;
  novelModeEnabled: boolean;
  refusalRecoveryEnabled: boolean;
  autoSplit: boolean;
  maxCharsPerChunk: number;
  overlapLines: number;
  maxParallelChunks: number;
  parallelMultiplier: number; // 1x, 2x, 3x, 4x, 5x, 10x, 20x, 100x
  maxOutputTokens: number;
}

export interface SavedProviderProfile {
  id: string;
  name: string;
  protocol: string;
  endpointUrl: string;
  model: string;
  apiKey: string;
  extraHeadersJson: string;
  anthropicVersion: string;
}

export interface Settings {
  version: number;
  migrationVersion: number;
  rememberedDraft: DraftSettings | null;
  savedProfiles: SavedProviderProfile[];
}

export interface FileState {
  name: string;
  format: string;
  size: number;
  lineCount: number;
  content: string;
}

export type FileFormat = 'txt' | 'csv' | 'md' | 'json' | 'log' | 'srt' | 'vtt' | 'xml' | 'yaml' | 'yml';

export interface ChunkConfig {
  sourceLanguage: string;
  targetLanguage: string;
  instruction: string;
  novelModeEnabled: boolean;
  refusalRecoveryEnabled: boolean;
  maxCharsPerChunk: number;
  overlapLines: number;
  maxParallelChunks: number;
  parallelMultiplier: number; // Applied to maxParallelChunks for dynamic scaling
  autoSplit: boolean;
}

export interface ChunkRecord {
  index: number;
  original: string;
  translatedCore: string;
  status: ChunkStatus;
  startTime: number | null;
  endTime: number | null;
  retryCount: number;
  error: string | null;
  diagnostics: ChunkDiagnostic[];
  validationIssues: ValidationIssue[];
}

export type ChunkStatus = 
  | "pending" 
  | "running" 
  | "success" 
  | "failed" 
  | "failed-validation" 
  | "failed-refusal"
  | "review-required"
  | "truncated";

export interface ChunkDiagnostic {
  timestamp: number;
  type: "info" | "warning" | "error";
  code: string;
  message: string;
}

export interface ValidationIssue {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
  chunkIndex?: number;
}

export interface ActiveRun {
  id: string;
  status: RunStatus;
  file: FileState;
  config: ChunkConfig;
  chunks: ChunkRecord[];
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  totalChunks: number;
  processedChunks: number;
  finalValidationIssues: ValidationIssue[];
  novelContext: NovelContext | null;
  progress: RunProgress;
}

export type RunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "completed-review-required"
  | "aborted"
  | "failed"
  | "cancelled";

export interface OutputView {
  mode: 'empty' | 'complete' | 'partial';
  text: string;
  successfulChunks: number;
  totalChunks: number;
  runStatus: RunStatus | null;
}

export interface RunProgress {
  percent: number;
  elapsedSeconds: number;
  averageChunkTime: number | null;
  etaSeconds: number | null;
}

export interface NovelContext {
  version: string;
  characters: NovelCharacter[];
  terms: string[];
  locations: string[];
  extractedAt: number;
}

export interface NovelCharacter {
  name: string;
  aliases: string[];
  descriptions: string[];
}

export interface ProviderPreset {
  id: string;
  label: string;
  providerName: string;
  protocol: string;
  endpointUrl: string;
  customEndpoint: boolean;
  requiresApiKey: boolean;
  docsUrl: string;
  modelCatalogUrl: string;
  exampleModel: string;
  browserStatus: "verified" | "risky" | "manual-only";
  browserStatusNote: string;
  availability: "preset" | "guide-only";
}

export interface ProviderConfig {
  protocol: string;
  preset: ProviderPreset | null;
  endpointUrl: string;
  model: string;
  apiKey: string;
  extraHeaders: Record<string, string>;
  anthropicVersion: string;
  maxOutputTokens?: number;
}

export type WorkspacePanelId = 
  | "file" 
  | "languages" 
  | "connection" 
  | "instructions" 
  | "run" 
  | "output" 
  | "diagnostics" 
  | "log";

export interface LogEntry {
  timestamp: number;
  level: "info" | "warning" | "error";
  message: string;
}

export const STORAGE_KEYS = {
  settings: "translationtxt.settings.v1",
  session: "translationtxt.session.v1",
  activeRun: "translationtxt.active-run.v1",
  activeRunFallback: "translationtxt.active-run-fallback.v1"
} as const;

export const DEFAULT_INSTRUCTION = [
  "Translate the following text completely, naturally and accurately.",
  "Maintain the original formatting, tone, and context; preserve line breaks, code fences, timestamps, and structural syntax.",
  "Translate every line into the target language, including dialogue and exclamations inside quote brackets such as 「」, 『』, \"\", '', （）, or (). Brackets stay; the words inside them must be translated.",
  "Do NOT leave source-language sound effects, interjections, or onomatopoeia (e.g. ああ, んっ, はぁ) untranslated — render them naturally in the target language.",
  "For technical terms, provide appropriate translations while keeping important keywords recognizable.",
  "Keep kinship terms and honorifics in romaji (e.g. onii-chan, -san, -sama). This is the ONLY thing that may stay in the source script's romanization — everything else must be translated.",
  "Do not add commentary or notes."
].join("\n\n");

export const LANGUAGE_LABELS: Record<string, string> = {
  auto: "Auto-detect",
  en: "English",
  id: "Indonesian",
  ja: "Japanese",
  es: "Spanish",
  zh: "Chinese"
};

export const FORMAT_LABELS: Record<string, string> = {
  txt: "Plain text",
  csv: "CSV",
  md: "Markdown",
  json: "JSON",
  log: "Log",
  srt: "SubRip subtitles",
  vtt: "WebVTT subtitles",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML"
};

export const PROTOCOL_LABELS: Record<string, string> = {
  "openai-compatible": "OpenAI-compatible",
  "anthropic-compatible": "Anthropic-compatible",
  gemini: "Google Gemini"
};

export const LINE_ORIENTED_FORMATS = new Set(["txt", "md", "log", "srt", "vtt"]);
export const NOVEL_MODE_FORMATS = new Set(["txt", "md"]);
export const STRUCTURED_FORMATS = new Set(["csv", "json", "xml", "yaml", "yml"]);
export const ALLOWED_FORMATS = new Set(["txt", "csv", "md", "json", "log", "srt", "vtt", "xml", "yaml", "yml"]);
