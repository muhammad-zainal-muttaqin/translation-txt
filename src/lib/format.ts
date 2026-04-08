export type FileFormat = 'txt' | 'csv' | 'md' | 'json' | 'log' | 'srt' | 'vtt' | 'xml' | 'yaml' | 'yml';

export interface FileInfo {
  name: string;
  format: FileFormat;
  size: number;
  lineCount: number;
  content: string;
}

export function detectFormat(filename: string, content: string): FileFormat {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const formatMap: Record<string, FileFormat> = {
    txt: 'txt',
    csv: 'csv',
    md: 'md',
    markdown: 'md',
    json: 'json',
    log: 'log',
    srt: 'srt',
    vtt: 'vtt',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yml',
  };

  if (formatMap[ext]) {
    return formatMap[ext];
  }

  if (content.startsWith('WEBVTT')) {
    return 'vtt';
  }

  if (content.startsWith('<?xml') || content.startsWith('<!DOCTYPE')) {
    return 'xml';
  }

  if (ext === 'txt' || ext === 'log') {
    return 'txt';
  }

  return 'txt';
}

export function isLineOriented(format: FileFormat): boolean {
  return ['txt', 'md', 'log', 'srt', 'vtt'].includes(format);
}

export function isStructured(format: FileFormat): boolean {
  return ['csv', 'json', 'xml', 'yaml', 'yml'].includes(format);
}

export function isSubtitle(format: FileFormat): boolean {
  return ['srt', 'vtt'].includes(format);
}

export function getFormatLabel(format: FileFormat): string {
  const labels: Record<FileFormat, string> = {
    txt: 'Plain text',
    csv: 'CSV',
    md: 'Markdown',
    json: 'JSON',
    log: 'Log',
    srt: 'SubRip subtitles',
    vtt: 'WebVTT subtitles',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
  };
  return labels[format];
}

export function parseSRTimestamp(timestamp: string): number {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds, ms] = match;
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(ms)
  );
}

export function parseVTTTimestamp(timestamp: string): number {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds, ms] = match;
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(ms)
  );
}

export function formatTimestampSRT(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

export function formatTimestampVTT(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function countCSVRows(content: string): number {
  const lines = content.split('\n').filter(line => line.trim());
  return lines.length;
}

export function getCSVHeader(content: string): string[] {
  const firstLine = content.split('\n')[0];
  if (!firstLine) return [];
  return firstLine.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
}

export function validateJSONStructure(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function validateXMLStructure(content: string): boolean {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  return parseError === null;
}
