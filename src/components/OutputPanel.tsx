import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { FileText, Download, Copy, Maximize2 } from 'lucide-react'

interface OutputPanelProps {
  onExpandPreview: () => void
}

export function OutputPanel({ onExpandPreview }: OutputPanelProps) {
  const { state } = useApp()
  const hasOutput = state.translationOutput.length > 0

  const handleCopy = async () => {
    await navigator.clipboard.writeText(state.translationOutput)
  }

  const handleDownloadSingle = () => {
    const blob = new Blob([state.translationOutput], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const originalName = state.file?.name || 'translated.txt'
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    a.download = `${baseName}.${state.file?.format || 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
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
          <Button variant="ghost" disabled={!hasOutput}>
            <Download className="h-4 w-4 mr-1" />
            Download ZIP
          </Button>
          <Button variant="ghost" disabled={!hasOutput} onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" />
            Copy translation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
