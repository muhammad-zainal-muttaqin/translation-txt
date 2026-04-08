import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { Sun, Moon } from 'lucide-react'

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Editorial Futuristik Control Desk</p>
          <h1 className="text-2xl font-serif text-primary">TranslationTXT</h1>
          <p className="text-sm text-muted-foreground">Local-first translation workspace for text and structured text files.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-sm">
            <span className="text-muted-foreground">Connection: </span>
            <span className="font-medium text-muted-foreground">Not configured</span>
          </div>
          
          <Button variant="ghost" size="sm" onClick={() => {}}>
            Go to connection
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
