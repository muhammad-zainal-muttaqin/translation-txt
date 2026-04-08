import { LINE_ORIENTED_FORMATS, STRUCTURED_FORMATS } from '../types';

export interface ChunkResult {
  chunks: string[];
  config: {
    maxCharsPerChunk: number;
    overlapLines: number;
  };
}

export interface SplitConfig {
  maxCharsPerChunk: number;
  overlapLines: number;
  autoSplit: boolean;
}

const CSV_ROW_OVERHEAD = 50;
const SRT_CUE_OVERHEAD = 100;
const VTT_CUE_OVERHEAD = 100;

export function getEffectiveSplitConfig(
  totalChars: number,
  totalLines: number,
  config: SplitConfig
): { maxChars: number; overlap: number } {
  const { maxCharsPerChunk, overlapLines, autoSplit } = config;

  if (autoSplit) {
    const targetChunks = Math.max(1, Math.ceil(totalChars / 15000));
    const maxChars = Math.min(24000, Math.max(3000, Math.ceil(totalChars / targetChunks)));
    const overlap = Math.min(20, Math.max(2, Math.floor(maxChars * 0.02)));
    return { maxChars, overlap };
  }

  return { maxChars: maxCharsPerChunk, overlap: overlapLines };
}

export function splitByLines(
  text: string,
  maxChars: number,
  overlap: number
): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let start = 0;

  while (start < lines.length) {
    let end = start;
    let charCount = 0;

    while (end < lines.length) {
      const lineLength = lines[end].length + 1;
      if (charCount + lineLength > maxChars && end > start) {
        break;
      }
      charCount += lineLength;
      end++;
    }

    if (end === start) {
      end = start + 1;
    }

    chunks.push(lines.slice(start, end).join('\n'));

    if (end >= lines.length) break;
    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}

export function splitByCSVRows(
  text: string,
  maxChars: number
): string[] {
  const lines = text.split('\n');
  if (lines.length === 0) return [];

  const hasHeader = lines[0].includes(',');
  const chunks: string[] = [];
  let currentChunk = '';
  let currentSize = 0;
  let header = hasHeader ? lines[0] + '\n' : '';

  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const lineSize = line.length + CSV_ROW_OVERHEAD;

    if (currentSize + lineSize > maxChars && currentChunk.length > 0) {
      chunks.push(header + currentChunk);
      header = '';
      currentChunk = line + '\n';
      currentSize = lineSize;
    } else {
      currentChunk += line + '\n';
      currentSize += lineSize;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(header + currentChunk);
  }

  return chunks;
}

export function splitBySubtitleCues(
  text: string,
  format: 'srt' | 'vtt',
  maxChars: number
): string[] {
  const cuePattern = format === 'srt'
    ? /^\d+\n\d{2}:\d{2}:\d{2},\d{3}\s-->\s\d{2}:\d{2}:\d{2},\d{3}/
    : /^WEBVTT\n|^(\d{2}:\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}:\d{2}\.\d{3})/m;

  const cues = text.split(cuePattern).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentSize = 0;

  for (const cue of cues) {
    const trimmed = cue.trim();
    if (!trimmed) continue;

    const cueSize = trimmed.length + (format === 'srt' ? SRT_CUE_OVERHEAD : VTT_CUE_OVERHEAD);

    if (currentSize + cueSize > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      currentSize = 0;
    }

    if (format === 'srt') {
      const cueIndex = chunks.length + 1;
      currentChunk += `${cueIndex}\n${trimmed}\n`;
    } else {
      currentChunk += `${trimmed}\n`;
    }
    currentSize += cueSize;
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

export function splitJSON(
  text: string,
  maxChars: number
): string[] {
  try {
    JSON.parse(text);
    if (text.length <= maxChars) {
      return [text];
    }
  } catch {
  }

  return [text];
}

export function splitXML(
  text: string,
  maxChars: number
): string[] {
  const rootPattern = /<([\w-]+)[^>]*>[\s\S]*<\/\1>|<([\w-]+)[^/>]*\/>/;
  const hasRoot = rootPattern.test(text);

  if (!hasRoot || text.length <= maxChars) {
    return [text];
  }

  return [text];
}

export function splitYAML(
  text: string,
  maxChars: number
): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const docs = text.split(/^---$/m);
  const chunks: string[] = [];
  let currentDoc = '';

  for (const doc of docs) {
    if (!doc.trim()) continue;

    if (currentDoc.length + doc.length > maxChars && currentDoc) {
      chunks.push(currentDoc);
      currentDoc = '';
    }

    currentDoc += (currentDoc ? '\n---\n' : '') + doc;
  }

  if (currentDoc.trim()) {
    chunks.push(currentDoc);
  }

  return chunks.length > 0 ? chunks : [text];
}

export function splitFileContent(
  text: string,
  format: string,
  config: SplitConfig
): ChunkResult {
  const { maxCharsPerChunk, overlapLines, autoSplit } = config;
  const { maxChars, overlap } = getEffectiveSplitConfig(text.length, text.split('\n').length, config);

  let chunks: string[] = [];

  if (LINE_ORIENTED_FORMATS.has(format)) {
    if (format === 'srt' || format === 'vtt') {
      chunks = splitBySubtitleCues(text, format, maxChars);
    } else {
      chunks = splitByLines(text, maxChars, overlap);
    }
  } else if (format === 'csv') {
    chunks = splitByCSVRows(text, maxChars);
  } else if (STRUCTURED_FORMATS.has(format)) {
    if (format === 'json') {
      chunks = splitJSON(text, maxChars);
    } else if (format === 'xml') {
      chunks = splitXML(text, maxChars);
    } else {
      chunks = splitYAML(text, maxChars);
    }
  } else {
    chunks = splitByLines(text, maxChars, overlap);
  }

  return {
    chunks,
    config: {
      maxCharsPerChunk: maxChars,
      overlapLines: overlap,
    },
  };
}

export function mergeChunks(
  chunks: string[],
  overlap: number,
  format: string
): string {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0];

  if (format === 'csv') {
    const lines = chunks.join('\n').split('\n').filter((line, index, arr) => {
      if (index === 0) return true;
      const prevLine = arr[index - 1];
      return line !== prevLine || line.includes(',');
    });
    return lines.join('\n');
  }

  if (format === 'srt' || format === 'vtt') {
    return chunks.join('\n\n');
  }

  const merged: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lines = chunk.split('\n');

    if (i === 0) {
      merged.push(...lines);
    } else {
      const linesToSkip = Math.min(overlap, lines.length);
      const linesToInclude = lines.slice(linesToSkip);
      merged.push(...linesToInclude);
    }
  }

  return merged.join('\n');
}
