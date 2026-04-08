import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Upload, FileText } from 'lucide-react'
import { FORMAT_LABELS } from '../types'
import { detectFormat } from '../lib/format'
import { validateFile } from '../lib/validation'

const ALLOWED_EXTENSIONS = ['.txt', '.csv', '.md', '.json', '.log', '.srt', '.vtt', '.xml', '.yaml', '.yml']

export function FilePanel() {
  const { state, dispatch } = useApp()
  const file = state.file
  const issues = state.filePreflightIssues

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const content = await selectedFile.text()
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    const lineCount = content.split('\n').length

    const format = detectFormat(selectedFile.name, content)

    const fileState = {
      name: selectedFile.name,
      format,
      size: selectedFile.size,
      lineCount,
      content,
    }

    dispatch({ type: 'SET_FILE', payload: fileState })

    const validation = validateFile(fileState)
    dispatch({ type: 'SET_FILE_PREFLIGHT_ISSUES', payload: validation.issues })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          File Intake
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div>
          <Input
            type="file"
            id="file-input"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="file-input" className="block">
            <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
              <Upload className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium text-sm sm:text-base">Add your file</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Drop here or browse: TXT, CSV, Markdown, JSON, logs, subtitles, XML, YAML
              </p>
            </div>
          </label>
        </div>

        {file && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">File</Label>
              <p className="font-medium truncate">{file.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Format</Label>
              <p className="font-medium">{FORMAT_LABELS[file.format] || file.format}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Size</Label>
              <p className="font-medium">{formatSize(file.size)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Lines</Label>
              <p className="font-medium">{file.lineCount}</p>
            </div>
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={
                  issue.level === 'error'
                    ? 'p-3 rounded-md text-sm bg-destructive/10 text-destructive'
                    : issue.level === 'warning'
                    ? 'p-3 rounded-md text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'p-3 rounded-md text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }
              >
                {issue.message}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
