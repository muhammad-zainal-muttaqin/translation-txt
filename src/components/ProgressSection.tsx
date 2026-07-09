import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { CheckCircle, XCircle, AlertCircle, Clock, Loader2, Pause, Play } from 'lucide-react'

function formatTime(seconds: number) {
  if (seconds < 60) return seconds + 's'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins + 'm ' + secs + 's'
}

function formatEta(seconds: number | null) {
  if (seconds === null) return null
  if (seconds < 60) return 'under a minute left'
  return `about ${Math.round(seconds / 60)} min left`
}

function chunkStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
    case 'failed':
    case 'failed-refusal':
      return <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
    case 'review-required':
    case 'failed-validation':
    case 'truncated':
      return <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />
    case 'running':
      return <Loader2 className="h-4 w-4 text-info animate-spin" aria-hidden="true" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  }
}

export function ProgressSection() {
  const { state, actions } = useApp()
  const activeRun = state.activeRun
  const progress = state.progress
  // null = user hasn't toggled yet; while untouched, follow the run state
  const [userToggledOpen, setUserToggledOpen] = useState<boolean | null>(null)
  const detailsOpen = userToggledOpen ?? state.isTranslating

  if (!activeRun) return null

  const totalChunks = progress.totalChunks || activeRun.totalChunks || 0
  const effectiveParallel =
    activeRun.config.maxParallelChunks ||
    Math.min(100, (state.draft?.maxParallelChunks || 3) * (state.draft?.parallelMultiplier || 1))
  const currentWave =
    progress.runningChunks.length > 0
      ? Math.floor(Math.min(...progress.runningChunks) / effectiveParallel) + 1
      : 0
  const totalWaves = totalChunks > 0 ? Math.ceil(totalChunks / effectiveParallel) : 0

  const done = state.outputView.successfulChunks
  const total = state.outputView.totalChunks || totalChunks
  const eta = formatEta(progress.etaSeconds ?? activeRun.progress?.etaSeconds ?? null)

  const isPausedRun = activeRun.status === 'paused' && !state.isTranslating

  const statusLine = (() => {
    if (state.isTranslating) {
      const base = done > 0 ? `Translating — ${done} of ${total} parts done` : 'Translating'
      return eta ? `${base} · ${eta}.` : `${base}…`
    }
    switch (activeRun.status) {
      case 'paused':
        return `Paused — ${done} of ${total} parts done. Resume whenever you're ready.`
      case 'failed':
        return done > 0
          ? `Stopped after an error — ${done} of ${total} parts finished.`
          : 'Something went wrong before any part finished. Check the details below.'
      case 'cancelled':
      case 'aborted':
        return `Stopped — ${done} of ${total} parts finished.`
      case 'completed':
      case 'completed-review-required':
        return `Done — ${total} ${total === 1 ? 'part' : 'parts'} translated in ${formatTime(activeRun.progress?.elapsedSeconds || 0)}.`
      default:
        return `${done} of ${total} parts done.`
    }
  })()

  return (
    <section aria-label="Progress" className="space-y-3 border-t pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="font-serif text-2xl">Progress</h2>
        <div className="flex gap-2 sm:ml-auto">
          {(state.isTranslating || isPausedRun) && (
            <Button
              id="cancel-translation"
              variant="secondary"
              size="sm"
              onClick={isPausedRun ? () => actions.resumeTranslation() : () => actions.pauseTranslation()}
              className="gap-1.5"
            >
              {isPausedRun ? (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Pause
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <p id="status-message" className="text-sm">
        {statusLine}
      </p>

      <div className="space-y-1.5">
        <Progress value={progress.percent} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {state.isTranslating && progress.runningChunks.length > 0 && (
              <>
                Wave {currentWave}/{totalWaves} — translating {progress.runningChunks.length} parts (
                {progress.runningChunks.map((index) => index + 1).join(', ')})
              </>
            )}
          </span>
          <span>{progress.percent}%</span>
        </div>
      </div>

      <details
        open={detailsOpen}
        onToggle={(e) => {
          const domOpen = (e.target as HTMLDetailsElement).open
          if (domOpen !== detailsOpen) setUserToggledOpen(domOpen)
        }}
      >
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Run details
        </summary>

        <div className="mt-3 space-y-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Format</dt>
              <dd className="font-medium truncate">{state.file?.format || activeRun.file?.format || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Provider</dt>
              <dd className="font-medium truncate">{state.draft?.providerPreset || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Parts</dt>
              <dd className="font-medium">{totalChunks}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="font-medium truncate">{activeRun.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Prepass</dt>
              <dd className="font-medium">{state.draft?.novelModeEnabled ? 'Novel mode' : 'Standard'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Elapsed</dt>
              <dd className="font-medium">
                {activeRun.progress?.elapsedSeconds ? formatTime(activeRun.progress.elapsedSeconds) : '0s'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">At once</dt>
              <dd className="font-medium">{effectiveParallel} parts</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ETA</dt>
              <dd className="font-medium">
                {formatEta(progress.etaSeconds ?? activeRun.progress?.etaSeconds ?? null) || '—'}
              </dd>
            </div>
          </dl>

          {activeRun.chunks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Parts</h3>
                <span className="text-xs text-muted-foreground">
                  {activeRun.chunks.filter((chunk) => chunk.status === 'success' || chunk.status === 'truncated').length}{' '}
                  / {activeRun.chunks.length} done
                </span>
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {activeRun.chunks.map((chunk, index) => (
                  <li key={index} className="flex items-center gap-2 text-xs">
                    {chunkStatusIcon(chunk.status)}
                    <span className={chunk.status === 'running' ? 'font-medium text-primary' : ''}>
                      Part {index + 1}
                    </span>
                    <span className="text-muted-foreground ml-auto">{chunk.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  )
}
