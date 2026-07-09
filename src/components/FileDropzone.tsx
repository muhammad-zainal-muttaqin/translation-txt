import { useRef, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Upload, FileText, X } from 'lucide-react'
import { FORMAT_LABELS } from '../types'
import { ALLOWED_EXTENSIONS, readFileForWorkspace } from '../lib/loadFile'
import { cn } from '../lib/utils'
import type { ValidationIssue } from '../types'

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

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

export function FileDropzone() {
  const { state, dispatch } = useApp()
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const file = state.file
  const issues = state.filePreflightIssues

  const loadFile = async (selectedFile: File) => {
    const { fileState, issues } = await readFileForWorkspace(selectedFile)
    dispatch({ type: 'SET_FILE', payload: fileState })
    dispatch({ type: 'SET_FILE_PREFLIGHT_ISSUES', payload: issues })
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) await loadFile(selectedFile)
    e.target.value = ''
  }

  const handleRemove = () => {
    dispatch({ type: 'SET_FILE', payload: null })
    dispatch({ type: 'SET_FILE_PREFLIGHT_ISSUES', payload: [] })
  }

  return (
    <section aria-label="Document" className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        id="file-input"
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {!file ? (
        <label htmlFor="file-input" className="block">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg px-6 py-12 text-center cursor-pointer transition-colors',
              'hover:border-primary hover:bg-accent/50',
              'focus-within:border-primary',
              dragOver ? 'border-primary bg-accent/50' : 'border-border'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) await loadFile(dropped)
            }}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
            <p className="font-serif text-2xl">
              {dragOver ? 'Drop to load' : 'Translate a document'}
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Drop a file here or click to browse — plain text, Markdown, subtitles, CSV, JSON,
              logs, XML, or YAML. Everything stays in your browser.
            </p>
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
          <FileText className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {FORMAT_LABELS[file.format] || file.format} · {formatSize(file.size)} ·{' '}
              {file.lineCount.toLocaleString()} lines
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={state.isTranslating}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={state.isTranslating}
              aria-label="Remove file"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className={issueClass(issue.level)}>
              {issue.message}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
