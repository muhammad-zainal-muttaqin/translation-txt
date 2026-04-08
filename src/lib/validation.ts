import { ValidationIssue, FileState } from '../types';
import { ALLOWED_FORMATS, STRUCTURED_FORMATS } from '../types';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB - practically unlimited for text files
const MAX_CHARS = 500 * 1024 * 1024; // 500MB - practically unlimited
// Note: MAX_LINES removed - no line count limit for novels/long texts
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

export function validateFile(file: FileState): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!file.name || file.name.length === 0) {
    issues.push({
      level: 'error',
      code: 'MISSING_FILENAME',
      message: 'File name is missing.',
    });
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

  // No line count limit - supports novels and long texts of any length
  // Only warn if file is extremely large (over 100k lines)
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
    } catch (e) {
      issues.push({
        level: 'error',
        code: 'INVALID_JSON',
        message: 'File content is not valid JSON.',
      });
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
      issues.push({
        level: 'warning',
        code: 'MALFORMED_VTT',
        message: 'WebVTT file should start with "WEBVTT" header.',
      });
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

  return {
    valid: !issues.some(i => i.level === 'error'),
    issues,
  };
}

export function validateProviderConfig(config: {
  endpointUrl: string;
  model: string;
  apiKey: string;
  extraHeadersJson?: string;
}): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!config.endpointUrl || config.endpointUrl.trim() === '') {
    issues.push({
      level: 'error',
      code: 'MISSING_ENDPOINT',
      message: 'Endpoint URL is required.',
    });
  } else {
    try {
      new URL(config.endpointUrl);
    } catch {
      issues.push({
        level: 'error',
        code: 'INVALID_ENDPOINT',
        message: 'Endpoint URL is not a valid URL.',
      });
    }
  }

  if (!config.model || config.model.trim() === '') {
    issues.push({
      level: 'error',
      code: 'MISSING_MODEL',
      message: 'Model name is required.',
    });
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    issues.push({
      level: 'warning',
      code: 'MISSING_API_KEY',
      message: 'API key is not set.',
    });
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
      issues.push({
        level: 'error',
        code: 'INVALID_EXTRA_HEADERS',
        message: `Extra headers must be valid JSON: ${msg}`,
      });
    }
  }

  return {
    valid: !issues.some(i => i.level === 'error'),
    issues,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
