import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Play, Pause } from 'lucide-react'

export function RunPanel() {
  const { state } = useApp()
  const activeRun = state.activeRun
  const progress = state.progress

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatEta = (seconds: number | null) => {
    if (seconds === null) return '-'
    return formatTime(seconds)
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
            <p className="font-medium">{state.originalChunks.length || 0}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium">
              {state.isTranslating ? 'Running' : activeRun?.status || 'Idle'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Prepass</span>
            <p className="font-medium">Not used</p>
          </div>
          <div>
            <span className="text-muted-foreground">Mode</span>
            <p className="font-medium">
              {state.draft?.novelModeEnabled ? 'Novel' : 'Standard'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Elapsed</span>
            <p className="font-medium">{formatTime(progress.percent)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Avg chunk</span>
            <p className="font-medium">-</p>
          </div>
          <div>
            <span className="text-muted-foreground">ETA</span>
            <p className="font-medium">-</p>
          </div>
        </div>

        {state.finalValidationIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Validation Issues</h4>
            {state.finalValidationIssues.map((issue, i) => (
              <div
                key={i}
                className={`p-3 rounded-md text-sm ${
                  issue.level === 'error'
                    ? 'bg-destructive/10 text-destructive'
                    : issue.level === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}
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
