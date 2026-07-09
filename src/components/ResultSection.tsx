import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Download, Copy, Check, Maximize2 } from 'lucide-react'
import { downloadSingleFile, downloadZip, generateTranslatedFilename, copyToClipboard } from '../lib/download'
import { LargeTextPreview } from './LargeTextPreview'
import type { ValidationIssue } from '../types'

function issueClass(level: ValidationIssue['level']) {
  switch (level) {
    case 'error':
      return 'p-3 rounded-md text-sm bg-destructive/10 text-destructive'
    case 'warning':
      return 'p-3 rounded-md text-sm bg-warning/10 text-warning'
    default:
      return 'p-3 rounded-md text-sm bg-info/10 text-info'
  }
}

interface ResultSectionProps {
  onExpandPreview: () => void
}

export function ResultSection({ onExpandPreview }: ResultSectionProps) {
  const { state } = useApp()
  const [copySuccess, setCopySuccess] = useState(false)

  const hasOutput = state.outputView.text.length > 0
  const totalChunks = state.activeRun?.chunks.length || 0
  const isPartial = state.outputView.mode === 'partial'

  if (state.outputView.mode === 'empty') return null

  const handleCopy = async () => {
    const success = await copyToClipboard(state.outputView.text)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleDownloadSingle = () => {
    if (!state.file || !state.outputView.text) return

    const filename = generateTranslatedFilename(
      state.file.name,
      state.draft?.targetLanguage || 'en',
      isPartial
    )

    downloadSingleFile({
      filename,
      content: state.outputView.text,
    })
  }

  const handleDownloadZip = async () => {
    if (!state.file || totalChunks === 0) return

    const targetLang = state.draft?.targetLanguage || 'en'
    const originalName = state.file.name
    const translatedName = generateTranslatedFilename(originalName, targetLang, isPartial)

    const metadata: Record<string, unknown> = {
      originalFile: originalName,
      translatedFile: translatedName,
      sourceLanguage: state.draft?.sourceLanguage || 'auto',
      targetLanguage: targetLang,
      translationDate: new Date().toISOString(),
      totalChunks,
      provider: state.draft?.providerPreset || state.draft?.providerProtocol,
      model: state.draft?.model,
    }

    if (state.outputView.mode === 'partial') {
      metadata.isPartial = true
      metadata.partialMode = 'success-only'
      metadata.runStatus = state.outputView.runStatus
      metadata.successfulChunks = state.outputView.successfulChunks
      metadata.totalChunks = state.outputView.totalChunks
    }

    await downloadZip({
      filename: 'translation_' + Date.now() + '.zip',
      files: [
        { name: 'original/' + originalName, content: state.file.content },
        { name: 'translated/' + translatedName, content: state.outputView.text },
      ],
      metadata,
    })
  }

  return (
    <section aria-label="Result" className="space-y-4 border-t pt-8">
      <h2 className="font-serif text-2xl">Your translation</h2>

      {isPartial && (
        <div className="p-3 rounded-md text-sm bg-warning/10 text-warning">
          <strong>Partial result:</strong> {state.outputView.successfulChunks} of{' '}
          {state.outputView.totalChunks} parts finished before the run{' '}
          {state.outputView.runStatus === 'running' ? 'continues' : `was ${state.outputView.runStatus}`}. You
          can download what's done, or resume above.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Original</h3>
          <LargeTextPreview
            text={state.file?.content || ''}
            emptyMessage="Nothing loaded yet."
            className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono"
          />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Translated</h3>
          <LargeTextPreview
            text={state.outputView.text}
            emptyMessage="No translation yet."
            className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!hasOutput} onClick={handleDownloadSingle}>
          <Download className="h-4 w-4 mr-1" aria-hidden="true" />
          Download
        </Button>
        <Button variant="ghost" size="sm" disabled={!hasOutput || totalChunks === 0} onClick={handleDownloadZip}>
          <Download className="h-4 w-4 mr-1" aria-hidden="true" />
          ZIP with original
        </Button>
        <Button variant="ghost" size="sm" disabled={!hasOutput} onClick={handleCopy}>
          {copySuccess ? (
            <Check className="h-4 w-4 mr-1 text-success" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
          )}
          {copySuccess ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onExpandPreview} className="sm:ml-auto">
          <Maximize2 className="h-4 w-4 mr-1" aria-hidden="true" />
          Compare side by side
        </Button>
      </div>

      {state.finalValidationIssues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Review notes</h3>
          {state.finalValidationIssues.map((issue, index) => (
            <div key={index} className={issueClass(issue.level)}>
              {issue.message}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
