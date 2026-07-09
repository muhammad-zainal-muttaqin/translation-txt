import { useEffect, useRef, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { FileDropzone } from './FileDropzone'
import { LanguageBar } from './LanguageBar'
import { TranslateBar } from './TranslateBar'
import { ProgressSection } from './ProgressSection'
import { ResultSection } from './ResultSection'
import { ActivitySection } from './ActivitySection'
import { readFileForWorkspace } from '../lib/loadFile'
import { FileDown } from 'lucide-react'

interface TranslatePageProps {
  onExpandPreview: () => void
  onOpenSettings: () => void
}

export function TranslatePage({ onExpandPreview, onOpenSettings }: TranslatePageProps) {
  const { state, dispatch } = useApp()
  const [pageDragActive, setPageDragActive] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const previousMode = useRef(state.outputView.mode)
  const isTranslatingRef = useRef(state.isTranslating)

  useEffect(() => {
    isTranslatingRef.current = state.isTranslating
  }, [state.isTranslating])

  // Drag a file anywhere on the page to load it.
  useEffect(() => {
    let dragDepth = 0

    const hasFilePayload = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files')

    const onDragEnter = (e: DragEvent) => {
      if (!hasFilePayload(e) || isTranslatingRef.current) return
      dragDepth += 1
      setPageDragActive(true)
    }
    const onDragOver = (e: DragEvent) => {
      if (!hasFilePayload(e) || isTranslatingRef.current) return
      e.preventDefault()
    }
    const onDragLeave = (e: DragEvent) => {
      if (!hasFilePayload(e)) return
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) setPageDragActive(false)
    }
    const onDrop = async (e: DragEvent) => {
      if (!hasFilePayload(e)) return
      e.preventDefault()
      dragDepth = 0
      setPageDragActive(false)
      if (isTranslatingRef.current) return
      const dropped = e.dataTransfer?.files?.[0]
      if (!dropped) return
      const { fileState, issues } = await readFileForWorkspace(dropped)
      dispatch({ type: 'SET_FILE', payload: fileState })
      dispatch({ type: 'SET_FILE_PREFLIGHT_ISSUES', payload: issues })
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [dispatch])

  // When a run finishes, bring the result into view.
  useEffect(() => {
    if (previousMode.current !== 'complete' && state.outputView.mode === 'complete') {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      resultRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }
    previousMode.current = state.outputView.mode
  }, [state.outputView.mode])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <FileDropzone />
      <LanguageBar />
      <TranslateBar onOpenSettings={onOpenSettings} />
      <ProgressSection />
      <div ref={resultRef}>
        <ResultSection onExpandPreview={onExpandPreview} />
      </div>
      <ActivitySection />

      {pageDragActive && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/90 pointer-events-none"
          aria-hidden="true"
        >
          <div className="text-center">
            <FileDown className="h-10 w-10 mx-auto mb-3 text-primary" />
            <p className="font-serif text-3xl">Drop your file to load it</p>
          </div>
        </div>
      )}
    </div>
  )
}
