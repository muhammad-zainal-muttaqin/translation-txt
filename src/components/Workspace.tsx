import { useApp } from '../contexts/AppContext'
import { FilePanel } from './FilePanel'
import { LanguagesPanel } from './LanguagesPanel'
import { ConnectionPanel } from './ConnectionPanel'
import { InstructionsPanel } from './InstructionsPanel'
import { RunPanel } from './RunPanel'
import { DiagnosticsPanel } from './DiagnosticsPanel'
import { LogPanel } from './LogPanel'
import { OutputPanel } from './OutputPanel'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { cn } from '../lib/utils'

interface WorkspaceProps {
  onExpandPreview: () => void
}

const PANELS = [
  { id: 'file', label: 'File' },
  { id: 'languages', label: 'Languages' },
  { id: 'connection', label: 'Connection' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'run', label: 'Run' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'log', label: 'Log' },
  { id: 'output', label: 'Output' },
] as const

export function Workspace({ onExpandPreview }: WorkspaceProps) {
  const { state, dispatch } = useApp()
  const activePanel = state.activePanel

  const handlePanelChange = (panelId: string) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panelId as any })
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
      <div className="hidden md:flex border-b mb-4">
        <Tabs value={activePanel} onValueChange={handlePanelChange}>
          <TabsList className="h-auto p-0 bg-transparent gap-1">
            {PANELS.map((panel) => (
              <TabsTrigger
                key={panel.id}
                value={panel.id}
                className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none px-4 py-2",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                )}
              >
                {panel.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="md:hidden mb-3 sm:mb-4">
        <select
          value={activePanel}
          onChange={(e) => handlePanelChange(e.target.value)}
          className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {PANELS.map((panel) => (
            <option key={panel.id} value={panel.id}>
              {panel.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {activePanel === 'file' && <FilePanel />}
        {activePanel === 'languages' && <LanguagesPanel />}
        {activePanel === 'connection' && <ConnectionPanel />}
        {activePanel === 'instructions' && <InstructionsPanel />}
        {activePanel === 'run' && <RunPanel />}
        {activePanel === 'diagnostics' && <DiagnosticsPanel />}
        {activePanel === 'log' && <LogPanel />}
        {activePanel === 'output' && <OutputPanel onExpandPreview={onExpandPreview} />}
      </div>
    </div>
  )
}
