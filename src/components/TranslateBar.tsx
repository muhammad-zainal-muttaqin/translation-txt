import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Play, Loader2, Zap } from 'lucide-react'

const MULTIPLIER_OPTIONS = [1, 2, 3, 4, 5, 10, 20, 100] as const

interface TranslateBarProps {
  onOpenSettings: () => void
}

export function TranslateBar({ onOpenSettings }: TranslateBarProps) {
  const { state, dispatch, actions } = useApp()
  const draft = state.draft

  const hasFile = Boolean(state.file)
  const hasConnection = Boolean(draft?.endpointUrl && draft?.model)
  const hasFinishedRun = state.outputView.mode === 'complete'

  const baseParallel = draft?.maxParallelChunks || 3
  const parallelMultiplier = draft?.parallelMultiplier || 1
  const effectiveParallel = Math.min(100, baseParallel * parallelMultiplier)

  const buttonLabel = state.isTranslating
    ? 'Translating…'
    : hasFinishedRun
      ? 'Translate again'
      : 'Translate'

  const hint = !hasFile
    ? 'Add a file to get started.'
    : !hasConnection
      ? 'choose-provider'
      : null

  const handleClear = () => {
    if (confirm('Start over? The loaded file and any translation progress will be cleared.')) {
      actions.clearWorkspace()
    }
  }

  const handleDiscard = () => {
    if (confirm('Discard the saved run? Finished parts from it will be lost.')) {
      actions.discardActiveRun()
    }
  }

  return (
    <section aria-label="Translate" className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          id="start-translation"
          size="lg"
          className="w-full sm:w-auto sm:px-10 gap-2"
          disabled={!hasFile || state.isTranslating}
          onClick={() => actions.startTranslation()}
        >
          {state.isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {buttonLabel}
        </Button>

        {hint && (
          <p className="text-sm text-muted-foreground">
            {hint === 'choose-provider' ? (
              <>
                Choose a provider and model in{' '}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Settings
                </button>{' '}
                first.
              </>
            ) : (
              hint
            )}
          </p>
        )}

        <div className="flex gap-1 sm:ml-auto">
          {state.activeRun && !state.isTranslating && (
            <Button id="discard-saved-run" variant="ghost" size="sm" onClick={handleDiscard}>
              Discard saved run
            </Button>
          )}
          {(hasFile || state.activeRun) && (
            <Button id="clear-all" variant="ghost" size="sm" onClick={handleClear}>
              Start over
            </Button>
          )}
        </div>
      </div>

      {hasFile && (
        <details className="rounded-lg border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
            Speed: {parallelMultiplier}× — {effectiveParallel} {effectiveParallel === 1 ? 'part' : 'parts'} at once
          </summary>
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Speed multiplier">
              {MULTIPLIER_OPTIONS.map((mult) => {
                const isActive = (draft?.parallelMultiplier || 1) === mult
                return (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => {
                      if (!state.isTranslating && draft) {
                        dispatch({
                          type: 'SET_DRAFT',
                          payload: { ...draft, parallelMultiplier: mult },
                        })
                      }
                    }}
                    disabled={state.isTranslating}
                    aria-pressed={isActive}
                    className={
                      'px-2.5 py-1 rounded-md text-sm font-medium transition-colors ' +
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ' +
                      (isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground') +
                      (state.isTranslating ? ' opacity-50 cursor-not-allowed' : '')
                    }
                  >
                    {mult}×
                  </button>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Higher speed translates more parts at the same time ({baseParallel} × {parallelMultiplier} ={' '}
              {effectiveParallel}), but your provider may rate-limit you. Change it between runs, not during one.
            </p>
          </div>
        </details>
      )}
    </section>
  )
}
