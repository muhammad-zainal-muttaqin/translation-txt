import JSZip from 'jszip';

export interface DownloadOptions {
  filename: string;
  content: string;
  mimeType?: string;
}

export function downloadSingleFile(options: DownloadOptions): void {
  const { filename, content, mimeType = 'text/plain;charset=utf-8' } = options;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ZipOptions {
  filename: string;
  files: {
    name: string;
    content: string;
    mimeType?: string;
  }[];
  metadata?: Record<string, unknown>;
}

export async function downloadZip(options: ZipOptions): Promise<void> {
  const { filename, files, metadata } = options;
  const zip = new JSZip();

  for (const file of files) {
    const mimeType = file.mimeType || 'text/plain;charset=utf-8';
    const blob = new Blob([file.content], { type: mimeType });
    zip.file(file.name, blob);
  }

  if (metadata) {
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateTranslatedFilename(
  originalFilename: string,
  targetLanguage: string,
  isPartial = false
): string {
  const languageSuffix = getLanguageSuffix(targetLanguage);
  const partialSuffix = isPartial ? '-partial' : '';
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  const extension = originalFilename.split('.').pop() || 'txt';
  return `${baseName}-${languageSuffix}${partialSuffix}.${extension}`;
}

export function getLanguageSuffix(languageCode: string): string {
  const languageMap: Record<string, string> = {
    en: 'english',
    id: 'indonesia',
    ja: 'japanese',
    es: 'spanish',
    fr: 'french',
    de: 'german',
    zh: 'chinese',
    ko: 'korean',
    ar: 'arabic',
    ru: 'russian',
    pt: 'portuguese',
    it: 'italian',
    nl: 'dutch',
    sv: 'swedish',
    no: 'norwegian',
    da: 'danish',
    fi: 'finnish',
    pl: 'polish',
    tr: 'turkish',
    hi: 'hindi',
    th: 'thai',
    vi: 'vietnamese',
    auto: 'auto-detected',
  };

  if (!languageMap[languageCode]) {
    return languageCode.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  }

  return languageMap[languageCode];
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
