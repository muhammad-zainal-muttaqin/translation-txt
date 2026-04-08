import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Play, Pause, CheckCircle, XCircle, AlertCircle, Clock, Loader2, Zap } from 'lucide-react'

const MULTIPLIER_OPTIONS = [1, 2, 3, 4, 5, 10, 20, 100] as const

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

  // Calculate wave info
  const maxParallel = state.draft?.maxParallelChunks || 3
  const currentWave = progress.runningChunks.length > 0 
    ? Math.floor(Math.min(...progress.runningChunks) / maxParallel) + 1
    : 0
  const totalWaves = Math.ceil((progress.totalChunks || 1) / maxParallel)

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
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Play className="h-4 w-4 sm:h-5 sm:w-5" />
          Run Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="font-medium">Progress</span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-2 sm:h-4" />
          {progress.totalChunks > 0 && (
            <div className="text-[10px] sm:text-xs text-muted-foreground text-center space-y-0.5">
              <p>Chunk {progress.completedChunks} of {progress.totalChunks} completed</p>
              {state.isTranslating && progress.runningChunks.length > 0 && (
                <p className="flex items-center justify-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Wave {currentWave}/{totalWaves}: Processing {progress.runningChunks.length} chunks (
                  {progress.runningChunks.map(i => i + 1).join(', ')})
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">Format</span>
            <p className="font-medium truncate">{state.file?.format || 'None'}</p>
          </div>
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">Provider</span>
            <p className="font-medium truncate">{state.draft?.providerPreset || 'Not set'}</p>
          </div>
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">Chunks</span>
            <p className="font-medium">{progress.totalChunks || activeRun?.totalChunks || 0}</p>
          </div>
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">Status</span>
            <p className="font-medium truncate">{activeRun?.status || 'Idle'}</p>
          </div>
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">Prepass</span>
            <p className="font-medium">{state.draft?.novelModeEnabled ? 'Novel' : 'Std'}</p>
          </div>
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">Elapsed</span>
            <p className="font-medium">{activeRun?.progress?.elapsedSeconds ? formatTime(activeRun.progress.elapsedSeconds) : '0s'}</p>
          </div>
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">Parallel</span>
            <p className="font-medium">{maxParallel} chunks</p>
          </div>
          <div className="bg-muted/50 rounded p-2 sm:p-3">
            <span className="text-muted-foreground block text-[10px] sm:text-xs uppercase tracking-wider mb-1">ETA</span>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatEta(progress.etaSeconds || activeRun?.progress?.etaSeconds || null)}
            </p>
          </div>
        </div>

        {/* Parallel Speed Multiplier Control */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Speed Multiplier</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Base: {state.draft?.maxParallelChunks || 3} chunks × {state.draft?.parallelMultiplier || 1}x = <strong>{maxParallel} chunks</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {MULTIPLIER_OPTIONS.map((mult) => (
              <button
                key={mult}
                onClick={() => {
                  if (!state.isTranslating && state.draft) {
                    const updatedDraft = { ...state.draft, parallelMultiplier: mult }
                    // @ts-ignore - dispatch will be handled by parent
                    state.dispatch?.({ type: 'SET_DRAFT', payload: updatedDraft })
                  }
                }}
                disabled={state.isTranslating}
                className={`
                  px-2 py-1 rounded text-xs sm:text-sm font-medium transition-colors
                  ${(state.draft?.parallelMultiplier || 1) === mult 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'}
                  ${state.isTranslating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {mult}x
              </button>
            ))}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
            Higher multiplier = faster translation but may hit rate limits. Change only when not translating.
          </p>
        </div>

        {activeRun?.chunks && activeRun.chunks.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Chunks</h4>
              <span className="text-xs text-muted-foreground">
                {activeRun.chunks.filter(c => c.status === 'success' || c.status === 'truncated').length} / {activeRun.chunks.length} done
              </span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activeRun.chunks.map((chunk, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {getStatusIcon(chunk.status)}
                  <span className={chunk.status === 'running' ? 'font-medium text-primary' : ''}>
                    Chunk {i + 1}
                    {chunk.status === 'running' && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
                  </span>
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
