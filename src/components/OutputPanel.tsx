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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Output Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Original</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64">
              {state.file?.content || 'Nothing loaded yet.'}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Translated</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-64">
              {state.translationOutput || 'No translation yet.'}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onExpandPreview}>
            <Maximize2 className="h-4 w-4 mr-1" />
            Expand preview
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            variant="secondary"
            disabled={!hasOutput}
            onClick={handleDownloadSingle}
          >
            <Download className="h-4 w-4 mr-1" />
            Download translated file
          </Button>
          <Button 
            variant="ghost" 
            disabled={!hasOutput || translatedChunks.length === 0}
            onClick={handleDownloadZip}
          >
            <Download className="h-4 w-4 mr-1" />
            Download ZIP
          </Button>
          <Button 
            variant="ghost" 
            disabled={!hasOutput} 
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 mr-1" />
            {copySuccess ? 'Copied!' : 'Copy translation'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
