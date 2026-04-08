import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppProvider } from './contexts/AppContext'
import { Header } from './components/Header'
import { Workspace } from './components/Workspace'
import { FirstRunStrip } from './components/FirstRunStrip'
import { PreviewModal } from './components/PreviewModal'
import { cn } from './lib/utils'

function App() {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <ThemeProvider>
      <AppProvider>
        <a className="skip-link" href="#main-content">Skip to workspace</a>
        
        <Header />
        
        <main id="main-content" className={cn(
          "min-h-screen pb-16 sm:pb-20",
          "bg-background text-foreground"
        )}>
          <FirstRunStrip />
          
          <Workspace onExpandPreview={() => setPreviewOpen(true)} />
        </main>
        
        <footer className="py-3 sm:py-6 px-3 sm:px-4 text-center text-xs sm:text-sm text-muted-foreground border-t">
          <p className="mb-1 sm:mb-2 max-w-2xl mx-auto px-2">Runs in your browser by default. If a provider blocks cross-origin calls, use another gateway or a small proxy.</p>
          <a 
            href="https://github.com/muhammad-zainal-muttaqin/translation-txt" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Project repository
          </a>
        </footer>

        {previewOpen && (
          <PreviewModal open={previewOpen} onOpenChange={setPreviewOpen} />
        )}
      </AppProvider>
    </ThemeProvider>
  )
}

export default App
