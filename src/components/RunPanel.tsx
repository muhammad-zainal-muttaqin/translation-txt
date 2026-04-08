import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Play, Pause, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export function RunPanel() {
  const { state } = useApp()
  const activeRun = state.activeRun
  const progress = state.progress

  const formatTime = (seconds: number) => {
    if (seconds < 60) return seconds + 's'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins + 'm ' + secs + 's'
  }

  const formatEta = (seconds: number | null) => {
    if (seconds === null) return '-'
    return formatTime(seconds)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'failed-refusal':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'review-required':
      case 'failed-validation':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <span className="text-muted-foreground">-</span>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Run Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} />
          {progress.totalChunks > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Chunk {progress.currentChunk} of {progress.totalChunks}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Format</span>
            <p className="font-medium">{state.file?.format || 'None'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Provider</span>
            <p className="font-medium">{state.draft?.providerPreset || 'Not configured'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Chunks</span>
            <p className="font-medium">{progress.totalChunks || activeRun?.totalChunks || 0}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium">{activeRun?.status || 'Idle'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Prepass</span>
            <p className="font-medium">{state.draft?.novelModeEnabled ? 'Novel' : 'Standard'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Elapsed</span>
            <p className="font-medium">{activeRun?.progress?.elapsedSeconds ? formatTime(activeRun.progress.elapsedSeconds) : '0s'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Avg chunk</span>
            <p className="font-medium">{activeRun?.progress?.averageChunkTime ? formatTime(Math.round(activeRun.progress.averageChunkTime)) : '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">ETA</span>
            <p className="font-medium">{formatEta(activeRun?.progress?.etaSeconds || null)}</p>
          </div>
        </div>

        {activeRun?.chunks && activeRun.chunks.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Chunks</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activeRun.chunks.map((chunk, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {getStatusIcon(chunk.status)}
                  <span>Chunk {i + 1}</span>
                  <span className="text-muted-foreground ml-auto">{chunk.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.finalValidationIssues.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="font-medium">Validation Issues</h4>
            {state.finalValidationIssues.map((issue, i) => (
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
