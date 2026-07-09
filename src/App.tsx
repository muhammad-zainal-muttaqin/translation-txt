import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppProvider } from './contexts/AppContext'
import { Header } from './components/Header'
import { TranslatePage } from './components/TranslatePage'
import { PreviewModal } from './components/PreviewModal'
import { SettingsSheet } from './components/SettingsSheet'

function App() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <ThemeProvider>
      <AppProvider>
        <a className="skip-link" href="#main-content">Skip to workspace</a>

        <Header onOpenSettings={() => setSettingsOpen(true)} />

        <main id="main-content" className="min-h-screen pb-16 sm:pb-20 bg-background text-foreground">
          <TranslatePage
            onExpandPreview={() => setPreviewOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
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

        <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      </AppProvider>
    </ThemeProvider>
  )
}

export default App
