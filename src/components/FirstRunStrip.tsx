import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'

const STEPS = ['file', 'languages', 'connection', 'run'] as const

export function FirstRunStrip() {
  const { state, dispatch, actions } = useApp()
  const activePanel = state.activePanel

  const getStepStatus = (step: typeof STEPS[number]) => {
    switch (step) {
      case 'file':
        return state.file ? 'complete' : 'pending'
      case 'languages':
        return state.draft?.sourceLanguage && state.draft?.targetLanguage ? 'complete' : 'pending'
      case 'connection':
        return state.draft?.endpointUrl && state.draft?.model ? 'complete' : 'pending'
      case 'run':
        return state.activeRun ? 'complete' : 'pending'
      default:
        return 'pending'
    }
  }

  const handleStartTranslation = async () => {
    await actions.startTranslation()
  }

  const handlePause = () => {
    actions.pauseTranslation()
  }

  const handleResume = () => {
    actions.resumeTranslation()
  }

  const handleDiscard = () => {
    if (confirm('Are you sure you want to discard the saved run?')) {
      actions.discardActiveRun()
    }
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the workspace? All progress will be lost.')) {
      actions.clearWorkspace()
    }
  }

  return (
    <section className="border-b bg-muted/30">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col gap-3">
          {/* Top row - Title and Steps */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-medium text-sm sm:text-base">First Run</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Upload, set languages, configure connection, then run.</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {STEPS.map((step, index) => (
                <button
                  key={step}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: step })}
                  className={cn(
                    "px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                    activePanel === step && "bg-primary text-primary-foreground",
                    activePanel !== step && getStepStatus(step) === 'complete' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                    activePanel !== step && getStepStatus(step) === 'pending' && "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <span className="sm:hidden">{index + 1}</span>
                  <span className="hidden sm:inline">{index + 1}. {step.charAt(0).toUpperCase() + step.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row - Status and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p id="status-message" className="text-xs sm:text-sm text-muted-foreground">
              {(() => {
                // No file loaded
                if (!state.file) {
                  return 'Add a file to get started.'
                }

                // Currently translating
                if (state.isTranslating) {
                  if (state.outputView.mode === 'partial') {
                    return `Partial translation available (${state.outputView.successfulChunks}/${state.outputView.totalChunks} chunks) while translation continues...`
                  }
                  return 'Translating...'
                }

                // No active run - ready to translate
                if (!state.activeRun) {
                  return 'Ready to translate.'
                }

                // Has partial output
                if (state.outputView.mode === 'partial') {
                  const runStatus = state.outputView.runStatus
                  if (runStatus === 'running') {
                    return `Partial translation available (${state.outputView.successfulChunks}/${state.outputView.totalChunks} chunks) while translation continues.`
                  }
                  return `Partial translation available (${state.outputView.successfulChunks}/${state.outputView.totalChunks} chunks completed before ${runStatus}).`
                }

                // Failed without any successful chunks
                if (state.activeRun.status === 'failed' && state.outputView.mode === 'empty') {
                  return 'Translation failed before any chunk completed.'
                }

                // Completed
                if (state.outputView.mode === 'complete') {
                  return 'Translation complete.'
                }

                // Default fallback
                return 'Ready to translate.'
              })()}
            </p>
            
            <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:ml-auto">
              <Button 
                id="start-translation" 
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3"
                disabled={!state.file || state.isTranslating} 
                onClick={handleStartTranslation}
              >
                <span className="hidden sm:inline">Start translation</span>
                <span className="sm:hidden">Start</span>
              </Button>
              <Button
                id="cancel-translation"
                variant="secondary"
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3"
                disabled={!state.isTranslating && state.activeRun?.status !== 'paused'}
                onClick={state.activeRun?.status === 'paused' && !state.isTranslating ? handleResume : handlePause}
              >
                {state.activeRun?.status === 'paused' && !state.isTranslating ? 'Resume' : 'Pause'}
              </Button>
              <Button 
                id="discard-saved-run" 
                variant="ghost" 
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3 hidden sm:inline-flex"
                disabled={!state.activeRun}
                onClick={handleDiscard}
              >
                Discard
              </Button>
              <Button 
                id="clear-all" 
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3 hidden sm:inline-flex"
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          </div>

          {state.filePreflightIssues.length > 0 && (
            <div className="mt-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
              {state.filePreflightIssues.map((issue, i) => (
                <p key={i}>{issue.message}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
