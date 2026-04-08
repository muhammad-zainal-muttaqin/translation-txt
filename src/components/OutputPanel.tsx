import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { FileText, Download, Copy, Maximize2 } from 'lucide-react'
import { downloadSingleFile, downloadZip, generateTranslatedFilename, copyToClipboard } from '../lib/download'
import { useState } from 'react'
import { LargeTextPreview } from './LargeTextPreview'

interface OutputPanelProps {
  onExpandPreview: () => void
}

export function OutputPanel({ onExpandPreview }: OutputPanelProps) {
  const { state } = useApp()
  const [copySuccess, setCopySuccess] = useState(false)

  const hasOutput = state.outputView.text.length > 0
  const totalChunks = state.activeRun?.chunks.length || 0
  const isPartial = state.outputView.mode === 'partial'

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

    // Add partial output metadata if applicable
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
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          Output Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {isPartial && (
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm rounded">
            <strong>Partial translation available:</strong> {state.outputView.successfulChunks} of {state.outputView.totalChunks} chunks completed ({state.outputView.runStatus}).
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Original</h4>
            <LargeTextPreview
              text={state.file?.content || ''}
              emptyMessage="Nothing loaded yet."
              className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap"
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Translated</h4>
            <LargeTextPreview
              text={state.outputView.text}
              emptyMessage="No translation yet."
              className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onExpandPreview}>
            <Maximize2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Expand preview</span>
            <span className="inline sm:hidden">Expand</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasOutput}
            onClick={handleDownloadSingle}
          >
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Download translated file</span>
            <span className="inline sm:hidden">Download</span>
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            disabled={!hasOutput || totalChunks === 0}
            onClick={handleDownloadZip}
          >
            <Download className="h-4 w-4 mr-1" />
            ZIP
          </Button>
          <Button 
            variant="ghost"
            size="sm"
            disabled={!hasOutput} 
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 mr-1" />
            {copySuccess ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
