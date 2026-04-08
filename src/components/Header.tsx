import { useTheme } from '../contexts/ThemeContext'
import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Sun, Moon, Link } from 'lucide-react'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { state, dispatch } = useApp()

  const isConfigured = Boolean(state.draft?.endpointUrl && state.draft?.model)
  const connectionLabel = isConfigured
    ? state.draft?.providerPreset || state.draft?.providerProtocol || 'Configured'
    : 'Not configured'

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">Editorial Futuristik Control Desk</p>
          <h1 className="text-xl sm:text-2xl font-serif text-primary">TranslationTXT</h1>
          <p className="hidden sm:block text-sm text-muted-foreground">Local-first translation workspace for text and structured text files.</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden md:block text-sm">
            <span className="text-muted-foreground">Connection: </span>
            <span className={isConfigured ? 'font-medium text-primary' : 'font-medium text-muted-foreground'}>
              {connectionLabel}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'connection' })}
            className="hidden sm:inline-flex"
          >
            Go to connection
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'connection' })}
            className="sm:hidden"
            aria-label="Go to connection"
            title="Go to connection"
          >
            <Link className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
