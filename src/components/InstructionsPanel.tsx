import { useApp, getDefaultDraft } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Settings, CheckSquare } from 'lucide-react'
import { useEffect } from 'react'
import { Checkbox } from './ui/checkbox'

export function InstructionsPanel() {
  const { state, dispatch } = useApp()

  useEffect(() => {
    if (!state.draft) {
      dispatch({ type: 'SET_DRAFT', payload: getDefaultDraft() })
    }
  }, [])

  const updateDraft = (updates: Partial<typeof state.draft>) => {
    if (!state.draft) return
    dispatch({
      type: 'SET_DRAFT',
      payload: { ...state.draft, ...updates }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Instructions and Chunking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            id="use-default-instruction"
            checked={state.draft?.useDefaultInstruction ?? true}
            onCheckedChange={(checked) => updateDraft({ useDefaultInstruction: !!checked })}
          />
          <span className="text-sm">Use the recommended translation instruction</span>
        </label>

        <div>
          <Label htmlFor="custom-instruction-text">Custom instruction</Label>
          <Textarea
            id="custom-instruction-text"
            rows={9}
            placeholder="Add tone, terminology, or domain-specific instructions if needed."
            value={state.draft?.customInstruction || ''}
            onChange={(e) => updateDraft({ customInstruction: e.target.value })}
          />
        </div>

        <details className="cursor-pointer">
          <summary className="font-medium">Advanced chunking and validation</summary>
          <div className="mt-2 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="auto-split-toggle"
                checked={state.draft?.autoSplit ?? true}
                onCheckedChange={(checked) => updateDraft({ autoSplit: !!checked })}
              />
              <span className="text-sm">Choose chunk size automatically</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="novel-mode-toggle"
                checked={state.draft?.novelModeEnabled ?? true}
                onCheckedChange={(checked) => updateDraft({ novelModeEnabled: !!checked })}
              />
              <span className="text-sm">Novel mode for long-form fiction</span>
            </label>
            <p className="text-sm text-muted-foreground">
              For <code>.txt</code> and <code>.md</code>, run a larger prepass first, keep the 2-line continuity hint, 
              and inject bounded cast and glossary memory during translation.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max-chars-per-chunk">Max characters per chunk</Label>
                <Input
                  id="max-chars-per-chunk"
                  type="number"
                  min="500"
                  step="100"
                  value={state.draft?.maxCharsPerChunk || 9000}
                  onChange={(e) => updateDraft({ maxCharsPerChunk: parseInt(e.target.value) || 9000 })}
                />
              </div>

              <div>
                <Label htmlFor="overlap-lines">Overlap lines</Label>
                <Input
                  id="overlap-lines"
                  type="number"
                  min="0"
                  max="20"
                  value={state.draft?.overlapLines || 2}
                  onChange={(e) => updateDraft({ overlapLines: parseInt(e.target.value) || 2 })}
                />
              </div>

              <div>
                <Label htmlFor="max-parallel-chunks">Max parallel chunks</Label>
                <Input
                  id="max-parallel-chunks"
                  type="number"
                  min="1"
                  max="8"
                  value={state.draft?.maxParallelChunks || 3}
                  onChange={(e) => updateDraft({ maxParallelChunks: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Parallel waves automatically fall back to sequential mode if the provider starts rate limiting. 
              Overlap lines become context-only continuity hints for conversational text.
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
