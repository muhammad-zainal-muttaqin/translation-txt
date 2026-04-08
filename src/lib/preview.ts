export const LARGE_PREVIEW_LINE_THRESHOLD = 5000;
export const LARGE_PREVIEW_CHAR_THRESHOLD = 250000;
export const LARGE_PREVIEW_HEAD_LINES = 200;
export const LARGE_PREVIEW_TAIL_LINES = 50;

export interface TextPreview {
  content: string;
  isTruncated: boolean;
  totalLines: number;
  totalChars: number;
  omittedLines: number;
}

export function buildTextPreview(text: string): TextPreview {
  const totalChars = text.length;
  const lines = text.split('\n');
  const totalLines = lines.length;
  const shouldTruncate =
    totalLines > LARGE_PREVIEW_LINE_THRESHOLD ||
    totalChars > LARGE_PREVIEW_CHAR_THRESHOLD;

  if (!shouldTruncate) {
    return {
      content: text,
      isTruncated: false,
      totalLines,
      totalChars,
      omittedLines: 0,
    };
  }

  const headCount = Math.min(LARGE_PREVIEW_HEAD_LINES, totalLines);
  const tailCount = Math.min(
    LARGE_PREVIEW_TAIL_LINES,
    Math.max(0, totalLines - headCount)
  );
  const omittedLines = Math.max(0, totalLines - headCount - tailCount);

  const headLines = lines.slice(0, headCount);
  const tailLines = tailCount > 0 ? lines.slice(totalLines - tailCount) : [];
  const content = [
    ...headLines,
    '',
    `[Preview truncated: ${omittedLines.toLocaleString()} middle lines omitted. Use Copy or Download for the full text.]`,
    '',
    ...tailLines,
  ].join('\n');

  return {
    content,
    isTruncated: true,
    totalLines,
    totalChars,
    omittedLines,
  };
}
