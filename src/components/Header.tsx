import { useTheme } from '../contexts/ThemeContext'
import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Sun, Moon, Settings2 } from 'lucide-react'

interface HeaderProps {
  onOpenSettings: () => void
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { state } = useApp()

  const isConfigured = Boolean(state.draft?.endpointUrl && state.draft?.model)
  const connectionLabel = isConfigured
    ? state.draft?.providerPreset || state.draft?.providerProtocol || 'Connected'
    : 'No provider yet'

  return (
    <header className="border-b">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl sm:text-3xl leading-tight">TranslationTXT</h1>
          <p className="hidden sm:block text-sm text-muted-foreground">
            Translate whole documents, privately, in your browser.
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="gap-2"
            title="Open settings"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span
              className={
                'hidden md:inline-flex items-center rounded-full border px-2 py-0.5 text-xs ' +
                (isConfigured ? 'text-success border-success/40' : 'text-muted-foreground')
              }
            >
              {connectionLabel}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
