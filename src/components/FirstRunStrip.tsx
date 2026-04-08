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
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">First Run</h2>
            <p className="text-sm text-muted-foreground">Upload, set languages, configure connection, then run.</p>
          </div>

          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <button
                key={step}
                onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: step })}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                  activePanel === step && "bg-primary text-primary-foreground",
                  activePanel !== step && getStepStatus(step) === 'complete' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                  activePanel !== step && getStepStatus(step) === 'pending' && "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {index + 1} {step.charAt(0).toUpperCase() + step.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p id="status-message" className="text-sm">
            {state.file 
              ? state.isTranslating 
                ? 'Translating...' 
                : state.translationOutput 
                  ? 'Translation complete.' 
                  : 'Ready to translate.'
              : 'Add a file to get started.'}
          </p>
          
          <div className="flex gap-2 ml-auto">
            <Button 
              id="start-translation" 
              disabled={!state.file || state.isTranslating} 
              onClick={handleStartTranslation}
            >
              Start translation
            </Button>
            <Button 
              id="cancel-translation" 
              variant="secondary" 
              disabled={!state.isTranslating}
              onClick={handlePause}
            >
              {state.activeRun?.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button 
              id="discard-saved-run" 
              variant="ghost" 
              disabled={!state.activeRun}
              onClick={handleDiscard}
            >
              Discard saved run
            </Button>
            <Button 
              id="clear-all" 
              variant="ghost"
              onClick={handleClear}
            >
              Clear workspace
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
    </section>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
