import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { FileText, Download, Copy, Maximize2 } from 'lucide-react'
import { downloadSingleFile, downloadZip, generateTranslatedFilename, copyToClipboard } from '../lib/download'
import { useState } from 'react'

interface OutputPanelProps {
  onExpandPreview: () => void
}

export function OutputPanel({ onExpandPreview }: OutputPanelProps) {
  const { state } = useApp()
  const [copySuccess, setCopySuccess] = useState(false)

  const hasOutput = state.translationOutput.length > 0
  const originalChunks = state.activeRun?.chunks.map(c => c.original) || []
  const translatedChunks = state.activeRun?.chunks.map(c => c.translatedCore) || []

  const handleCopy = async () => {
    const success = await copyToClipboard(state.translationOutput)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleDownloadSingle = () => {
    if (!state.file || !state.translationOutput) return

    const filename = generateTranslatedFilename(
      state.file.name,
      state.draft?.targetLanguage || 'en'
    )

    downloadSingleFile({
      filename,
      content: state.translationOutput,
    })
  }

  const handleDownloadZip = async () => {
    if (!state.file || translatedChunks.length === 0) return

    const targetLang = state.draft?.targetLanguage || 'en'
    const originalName = state.file.name
    const translatedName = generateTranslatedFilename(originalName, targetLang)

    await downloadZip({
      filename: 'translation_' + Date.now() + '.zip',
      files: [
        { name: 'original/' + originalName, content: state.file.content },
        { name: 'translated/' + translatedName, content: state.translationOutput },
      ],
      metadata: {
        originalFile: originalName,
        translatedFile: translatedName,
        sourceLanguage: state.draft?.sourceLanguage || 'auto',
        targetLanguage: targetLang,
        translationDate: new Date().toISOString(),
        totalChunks: translatedChunks.length,
        provider: state.draft?.providerPreset || state.draft?.providerProtocol,
        model: state.draft?.model,
      },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Original</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 break-all whitespace-pre-wrap">
              {state.file?.content || 'Nothing loaded yet.'}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Translated</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64 break-all whitespace-pre-wrap">
              {state.translationOutput || 'No translation yet.'}
            </pre>
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
            disabled={!hasOutput || translatedChunks.length === 0}
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
