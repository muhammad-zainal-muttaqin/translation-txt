import { useMemo } from 'react'
import { buildTextPreview } from '../lib/preview'

interface LargeTextPreviewProps {
  text: string
  emptyMessage: string
  className?: string
}

export function LargeTextPreview({
  text,
  emptyMessage,
  className = '',
}: LargeTextPreviewProps) {
  const preview = useMemo(() => buildTextPreview(text), [text])

  if (!text) {
    return (
      <pre className={className}>
        {emptyMessage}
      </pre>
    )
  }

  return (
    <div className="space-y-2">
      <pre className={className}>
        {preview.content}
      </pre>
      {preview.isTruncated && (
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Preview truncated for performance. Showing a safe excerpt from{' '}
          {preview.totalLines.toLocaleString()} lines and{' '}
          {preview.totalChars.toLocaleString()} characters.
        </p>
      )}
    </div>
  )
}
