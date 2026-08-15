import type { ValidationIssue, FileState } from '../types';
import { ALLOWED_FORMATS, STRUCTURED_FORMATS } from '../types';
import { detectMetaCommentary } from './sanitize';

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_CHARS = 500 * 1024 * 1024;
const STRUCTURED_MAX_CHARS = 2 * 1024 * 1024;

const FORMAT_SIZE_LIMITS: Record<string, number> = {
  json: STRUCTURED_MAX_CHARS,
  xml: STRUCTURED_MAX_CHARS,
  yaml: STRUCTURED_MAX_CHARS,
  yml: STRUCTURED_MAX_CHARS,
};

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface TranslationOutputValidationOptions {
  rawOutput?: string;
  finishReason?: string;
}

function issue(
  code: string,
  message: string,
  chunkIndex?: number
): ValidationIssue {
  return {
    level: 'error',
    code,
    message,
    ...(chunkIndex === undefined ? {} : { chunkIndex }),
  };
}

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g'))].length;
}

function protectedTokens(text: string): string[] {
  return text.match(/\{\{[^{}\r\n]+\}\}|\$\{[^{}\r\n]+\}|%[^%\r\n]+%|`{3,}/g) || [];
}

function hasReasoningLeak(text: string): boolean {
  return /<\/?(?:think|thinking|reasoning)>|◁\/?think▷|\[\/?thinking\]|\b(?:analysis|reasoning|thought process)\s*:/i.test(text);
}

function hasPreamble(text: string): boolean {
  return /^\s*(?:sure|certainly|of course|okay|ok|alright|here(?:'s| is)?|translation|terjemahan|berikut|inilah)[^\n:]*:\s*(?:\r?\n|$)/i.test(text);
}

function hasRefusal(text: string): boolean {
  return /\b(?:i\s+(?:cannot|can't|am unable to)\s+(?:translate|assist|help|continue|comply)|cannot comply|unable to translate|refuse to translate|saya tidak bisa menerjemahkan|saya tidak dapat menerjemahkan)\b/i.test(text);
}

function csvColumnCount(row: string): number {
  let columns = 1;
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      columns++;
    }
  }

  return columns;
}

function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).filter(line => line.trim().length > 0);
}

function timestamps(text: string): string[] {
  return [...text.matchAll(/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/g)]
    .map(match => match[0].replace(/\s+/g, ' '));
}

function jsonShape(value: unknown): unknown {
  if (Array.isArray(value)) {
    return ['array', value.length, value.map(jsonShape)];
  }
  if (value !== null && typeof value === 'object') {
    return [
      'object',
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map(key => [key, jsonShape((value as Record<string, unknown>)[key])]),
    ];
  }
  return typeof value;
}

function xmlSignature(document: Document): string[] {
  return Array.from(document.getElementsByTagName('*')).map(node => node.nodeName);
}

function validateStructuredOutput(
  original: string,
  translated: string,
  format: string,
  issues: ValidationIssue[]
): void {
  if (format === 'json') {
    try {
      const output = JSON.parse(translated);
      try {
        const source = JSON.parse(original);
        if (JSON.stringify(jsonShape(source)) !== JSON.stringify(jsonShape(output))) {
          issues.push(issue('JSON_STRUCTURE_CHANGED', 'JSON keys, arrays, or value types changed.'));
        }
      } catch {
        // The source file was already checked before translation.
      }
    } catch {
      issues.push(issue('INVALID_JSON_OUTPUT', 'Translated JSON cannot be parsed.'));
    }
    return;
  }

  if (format === 'xml') {
    if (typeof DOMParser === 'undefined') return;

    const parser = new DOMParser();
    const outputDocument = parser.parseFromString(translated, 'application/xml');
    if (outputDocument.querySelector('parsererror')) {
      issues.push(issue('INVALID_XML_OUTPUT', 'Translated XML is not well-formed.'));
      return;
    }

    const sourceDocument = parser.parseFromString(original, 'application/xml');
    if (sourceDocument.querySelector('parsererror')) return;

    if (outputDocument.documentElement?.nodeName !== sourceDocument.documentElement?.nodeName) {
      issues.push(issue('XML_ROOT_CHANGED', 'Translated XML has a different root element.'));
    } else if (JSON.stringify(xmlSignature(outputDocument)) !== JSON.stringify(xmlSignature(sourceDocument))) {
      issues.push(issue('XML_STRUCTURE_CHANGED', 'Translated XML element structure changed.'));
    }
    return;
  }

  if (format === 'csv') {
    const sourceRows = nonEmptyLines(original);
    const outputRows = nonEmptyLines(translated);
    if (sourceRows.length !== outputRows.length) {
      issues.push(issue('CSV_ROW_COUNT_CHANGED', `CSV row count changed from ${sourceRows.length} to ${outputRows.length}.`));
      return;
    }

    for (let i = 0; i < sourceRows.length; i++) {
      const sourceColumns = csvColumnCount(sourceRows[i]);
      const outputColumns = csvColumnCount(outputRows[i]);
      if (sourceColumns !== outputColumns) {
        issues.push(issue('CSV_COLUMN_COUNT_CHANGED', `CSV row ${i + 1} has ${outputColumns} columns instead of ${sourceColumns}.`));
        break;
      }
    }
    return;
  }

  if (format === 'srt' || format === 'vtt') {
    const sourceTimestamps = timestamps(original);
    const outputTimestamps = timestamps(translated);
    if (
      sourceTimestamps.length !== outputTimestamps.length ||
      sourceTimestamps.some((value, index) => value !== outputTimestamps[index])
    ) {
      issues.push(issue('SUBTITLE_TIMESTAMPS_CHANGED', 'Subtitle cue timestamps were removed or changed.'));
    }

    if (format === 'vtt' && /^\s*WEBVTT\b/i.test(original) && !/^\s*WEBVTT\b/i.test(translated)) {
      issues.push(issue('VTT_HEADER_MISSING', 'The WebVTT header is missing.'));
    }
    return;
  }

  if (format === 'yaml' || format === 'yml') {
    const sourceDocuments = countMatches(original, /^---\s*$/gm);
    const outputDocuments = countMatches(translated, /^---\s*$/gm);
    if (sourceDocuments !== outputDocuments) {
      issues.push(issue('YAML_DOCUMENT_BOUNDARIES_CHANGED', 'YAML document boundaries changed.'));
    }
  }
}

function validateProtectedTokens(original: string, translated: string, issues: ValidationIssue[]): void {
  const sourceTokens = protectedTokens(original).sort();
  const outputTokens = protectedTokens(translated).sort();
  if (JSON.stringify(sourceTokens) !== JSON.stringify(outputTokens)) {
    issues.push(issue('PROTECTED_TOKENS_CHANGED', 'Important placeholders or code fences were removed or changed.'));
  }
}

function validateLineStructure(original: string, translated: string, format: string, issues: ValidationIssue[]): void {
  if (!['txt', 'md', 'log'].includes(format)) return;
  const sourceLines = original.trim().split(/\r?\n/).length;
  const translatedLines = translated.trim().split(/\r?\n/).length;
  if (sourceLines !== translatedLines) {
    issues.push(issue('LINE_STRUCTURE_CHANGED', `Line count changed from ${sourceLines} to ${translatedLines}.`));
  }
}

export function validateTranslationOutput(
  original: string,
  translated: string,
  format: string,
  options: TranslationOutputValidationOptions = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rawOutput = options.rawOutput ?? translated;
  const finishReason = String(options.finishReason || '').toLowerCase();

  if (!translated || !translated.trim()) {
    issues.push(issue('EMPTY_OUTPUT', 'The provider returned empty output.'));
  }

  if (finishReason === 'length' || finishReason === 'max_tokens') {
    issues.push(issue('TRUNCATED_OUTPUT', 'The provider stopped because the output length limit was reached.'));
  }

  if (hasReasoningLeak(rawOutput)) {
    issues.push(issue('REASONING_LEAK', 'The output contains model reasoning or thinking markers.'));
  }

  if (hasPreamble(rawOutput)) {
    issues.push(issue('META_COMMENTARY', 'The output contains a preamble instead of only the translation.'));
  }

  if (hasRefusal(rawOutput)) {
    issues.push(issue('REFUSAL', 'The provider refused to translate the part.'));
  }

  const meta = detectMetaCommentary(rawOutput);
  if (meta.flagged && !issues.some(current => current.code === 'META_COMMENTARY' || current.code === 'REFUSAL')) {
    issues.push(issue('META_COMMENTARY', `The output contains task commentary: ${meta.markers.join(', ')}.`));
  }

  if (translated.trim()) {
    validateProtectedTokens(original, translated, issues);
    validateLineStructure(original, translated, format, issues);
    validateStructuredOutput(original, translated, format, issues);
  }

  return {
    valid: !issues.some(current => current.level === 'error'),
    issues,
  };
}

export function validateFile(file: FileState): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!file.name || file.name.length === 0) {
    issues.push({ level: 'error', code: 'MISSING_FILENAME', message: 'File name is missing.' });
  }

  if (!file.format || !ALLOWED_FORMATS.has(file.format)) {
    issues.push({
      level: 'error',
      code: 'UNSUPPORTED_FORMAT',
      message: `Unsupported format: ${file.format}. Allowed: txt, csv, md, json, log, srt, vtt, xml, yaml, yml`,
    });
    return { valid: false, issues };
  }

  if (file.size > MAX_FILE_SIZE) {
    issues.push({
      level: 'error',
      code: 'FILE_TOO_LARGE',
      message: `File size (${formatBytes(file.size)}) exceeds maximum allowed (${formatBytes(MAX_FILE_SIZE)}).`,
    });
  }

  if (file.size > MAX_CHARS) {
    issues.push({
      level: 'warning',
      code: 'LARGE_FILE',
      message: `File is very large (${formatBytes(file.size)}). Translation may be slow or fail.`,
    });
  }

  if (file.lineCount > 100000) {
    issues.push({
      level: 'info',
      code: 'LARGE_LINE_COUNT',
      message: `File has ${file.lineCount.toLocaleString()} lines. Large files may take longer to process but are fully supported.`,
    });
  }

  const formatLimit = FORMAT_SIZE_LIMITS[file.format];
  if (formatLimit && file.size > formatLimit) {
    issues.push({
      level: 'error',
      code: 'FORMAT_SIZE_LIMIT',
      message: `${file.format.toUpperCase()} files are limited to ${formatBytes(formatLimit)}. This file is ${formatBytes(file.size)}.`,
    });
  }

  if (file.format === 'json') {
    try {
      JSON.parse(file.content);
    } catch {
      issues.push({ level: 'error', code: 'INVALID_JSON', message: 'File content is not valid JSON.' });
    }
  }

  if (file.format === 'srt') {
    const srtPattern = /^\d+\n\d{2}:\d{2}:\d{2},\d{3}\s-->\s\d{2}:\d{2}:\d{2},\d{3}/m;
    if (!srtPattern.test(file.content)) {
      issues.push({
        level: 'warning',
        code: 'MALFORMED_SRT',
        message: 'SRT file may be malformed. Expected timestamp format: 00:00:00,000 --> 00:00:00,000',
      });
    }
  }

  if (file.format === 'vtt') {
    if (!file.content.startsWith('WEBVTT')) {
      issues.push({ level: 'warning', code: 'MALFORMED_VTT', message: 'WebVTT file should start with "WEBVTT" header.' });
    }
    const vttPattern = /\d{2}:\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}:\d{2}\.\d{3}/;
    if (!vttPattern.test(file.content)) {
      issues.push({
        level: 'warning',
        code: 'MALFORMED_VTT_TIMING',
        message: 'WebVTT timestamps may be malformed. Expected format: 00:00:00.000 --> 00:00:00.000',
      });
    }
  }

  if (file.format === 'csv') {
    const lines = file.content.split('\n');
    const firstLineCols = (lines[0] || '').split(',').length;
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const cols = lines[i].split(',').length;
      if (cols !== firstLineCols) {
        issues.push({
          level: 'warning',
          code: 'IRREGULAR_CSV',
          message: 'CSV row ' + (i + 1) + ' has different column count than header.',
        });
        break;
      }
    }
  }

  if (STRUCTURED_FORMATS.has(file.format) && file.size > 500 * 1024) {
    issues.push({
      level: 'info',
      code: 'LARGE_STRUCTURED_FILE',
      message: `${file.format.toUpperCase()} files over 500KB may take longer to process.`,
    });
  }

  return { valid: !issues.some(i => i.level === 'error'), issues };
}

export function validateProviderConfig(config: {
  endpointUrl: string;
  model: string;
  apiKey: string;
  extraHeadersJson?: string;
}): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!config.endpointUrl || config.endpointUrl.trim() === '') {
    issues.push({ level: 'error', code: 'MISSING_ENDPOINT', message: 'Endpoint URL is required.' });
  } else {
    try {
      new URL(config.endpointUrl);
    } catch {
      issues.push({ level: 'error', code: 'INVALID_ENDPOINT', message: 'Endpoint URL is not a valid URL.' });
    }
  }

  if (!config.model || config.model.trim() === '') {
    issues.push({ level: 'error', code: 'MISSING_MODEL', message: 'Model name is required.' });
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    issues.push({ level: 'warning', code: 'MISSING_API_KEY', message: 'API key is not set.' });
  }

  if (config.extraHeadersJson && config.extraHeadersJson.trim() !== '') {
    try {
      const parsed = JSON.parse(config.extraHeadersJson);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        issues.push({
          level: 'error',
          code: 'INVALID_EXTRA_HEADERS',
          message: 'Extra headers must be a JSON object (e.g. {"X-Foo":"bar"}).',
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'parse error';
      issues.push({ level: 'error', code: 'INVALID_EXTRA_HEADERS', message: `Extra headers must be valid JSON: ${msg}` });
    }
  }

  return { valid: !issues.some(i => i.level === 'error'), issues };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
