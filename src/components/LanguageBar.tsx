import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ArrowLeftRight } from 'lucide-react'

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
  { value: 'zh', label: 'Chinese' },
  { value: 'custom', label: 'Custom…' },
]

const selectClass = 'w-full mt-1 p-2 border rounded-md bg-background text-sm'

export function LanguageBar() {
  const { state, dispatch } = useApp()
  const draft = state.draft

  const updateDraft = (updates: Partial<typeof draft>) => {
    if (!draft) return
    dispatch({ type: 'SET_DRAFT', payload: { ...draft, ...updates } })
  }

  const canSwap = draft?.sourceLanguage !== 'auto'

  const handleSwap = () => {
    if (!draft || !canSwap) return
    updateDraft({
      sourceLanguage: draft.targetLanguage,
      sourceLanguageCustom: draft.targetLanguageCustom,
      targetLanguage: draft.sourceLanguage,
      targetLanguageCustom: draft.sourceLanguageCustom,
    })
  }

  return (
    <section aria-label="Languages" className="flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex-1">
        <Label htmlFor="source-language">Translate from</Label>
        <select
          id="source-language"
          value={draft?.sourceLanguage || 'auto'}
          onChange={(e) => updateDraft({ sourceLanguage: e.target.value })}
          className={selectClass}
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {draft?.sourceLanguage === 'custom' && (
          <Input
            id="source-language-custom"
            placeholder="French, German, Arabic…"
            className="mt-2"
            value={draft?.sourceLanguageCustom || ''}
            onChange={(e) => updateDraft({ sourceLanguageCustom: e.target.value })}
          />
        )}
      </div>

      <div className="sm:pt-7 self-center sm:self-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwap}
          disabled={!canSwap}
          aria-label="Swap languages"
          title={canSwap ? 'Swap languages' : "Can't swap from auto-detect"}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1">
        <Label htmlFor="target-language">Into</Label>
        <select
          id="target-language"
          value={draft?.targetLanguage || 'en'}
          onChange={(e) => updateDraft({ targetLanguage: e.target.value })}
          className={selectClass}
        >
          {LANGUAGE_OPTIONS.filter((opt) => opt.value !== 'auto').map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {draft?.targetLanguage === 'custom' && (
          <Input
            id="target-language-custom"
            placeholder="French, German, Arabic…"
            className="mt-2"
            value={draft?.targetLanguageCustom || ''}
            onChange={(e) => updateDraft({ targetLanguageCustom: e.target.value })}
          />
        )}
      </div>
    </section>
  )
}
