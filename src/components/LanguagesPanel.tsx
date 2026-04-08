import { useApp, getDefaultDraft } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Languages as LanguagesIcon } from 'lucide-react'
import { LANGUAGE_LABELS } from '../types'
import { useEffect } from 'react'

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
  { value: 'zh', label: 'Chinese' },
  { value: 'custom', label: 'Custom' },
]

export function LanguagesPanel() {
  const { state, dispatch } = useApp()

  useEffect(() => {
    if (!state.draft) {
      dispatch({ type: 'SET_DRAFT', payload: getDefaultDraft() })
    }
  }, [])

  const handleSourceChange = (value: string) => {
    if (!state.draft) return
    dispatch({
      type: 'SET_DRAFT',
      payload: { ...state.draft, sourceLanguage: value }
    })
  }

  const handleTargetChange = (value: string) => {
    if (!state.draft) return
    dispatch({
      type: 'SET_DRAFT',
      payload: { ...state.draft, targetLanguage: value }
    })
  }

  const handleSourceCustomChange = (value: string) => {
    if (!state.draft) return
    dispatch({
      type: 'SET_DRAFT',
      payload: { ...state.draft, sourceLanguageCustom: value }
    })
  }

  const handleTargetCustomChange = (value: string) => {
    if (!state.draft) return
    dispatch({
      type: 'SET_DRAFT',
      payload: { ...state.draft, targetLanguageCustom: value }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <LanguagesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          Languages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="source-language">Source language</Label>
            <select
              id="source-language"
              value={state.draft?.sourceLanguage || 'auto'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md bg-background"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {state.draft?.sourceLanguage === 'custom' && (
              <Input
                id="source-language-custom"
                placeholder="French, German, Arabic, and so on"
                className="mt-2"
                value={state.draft?.sourceLanguageCustom || ''}
                onChange={(e) => handleSourceCustomChange(e.target.value)}
              />
            )}
          </div>

          <div>
            <Label htmlFor="target-language">Target language</Label>
            <select
              id="target-language"
              value={state.draft?.targetLanguage || 'en'}
              onChange={(e) => handleTargetChange(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md bg-background"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {state.draft?.targetLanguage === 'custom' && (
              <Input
                id="target-language-custom"
                placeholder="French, German, Arabic, and so on"
                className="mt-2"
                value={state.draft?.targetLanguageCustom || ''}
                onChange={(e) => handleTargetCustomChange(e.target.value)}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
