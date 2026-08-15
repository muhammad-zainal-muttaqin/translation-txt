import { useEffect, useRef, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'
import { Save, Trash2 } from 'lucide-react'
import { saveProviderProfile, deleteProviderProfile } from '../lib/storage'
import type { SavedProviderProfile } from '../types'

const PROTOCOL_OPTIONS = [
  { value: 'openai-compatible', label: 'OpenAI-compatible' },
  { value: 'anthropic-compatible', label: 'Anthropic-compatible' },
  { value: 'gemini', label: 'Google Gemini' },
]

const PRESET_OPTIONS: Record<string, { value: string; label: string }[]> = {
  'openai-compatible': [
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'deepseek-openai', label: 'DeepSeek' },
    { value: 'fireworks-openai', label: 'Fireworks' },
    { value: 'xai', label: 'xAI' },
    { value: 'minimax-openai', label: 'MiniMax' },
    { value: 'openai', label: 'OpenAI' },
  ],
  'anthropic-compatible': [
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'deepseek-anthropic', label: 'DeepSeek' },
  ],
  'gemini': [
    { value: 'gemini', label: 'Google Gemini' },
  ],
}

const PRESET_ENDPOINTS: Record<string, string> = {
  'openrouter': 'https://openrouter.ai/api/v1/chat/completions',
  'deepseek-openai': 'https://api.deepseek.com/chat/completions',
  'fireworks-openai': 'https://api.fireworks.ai/inference/v1/chat/completions',
  'xai': 'https://api.x.ai/v1/chat/completions',
  'minimax-openai': 'https://api.minimax.io/v1/chat/completions',
  'openai': 'https://api.openai.com/v1/chat/completions',
  'anthropic': 'https://api.anthropic.com/v1/messages',
  'deepseek-anthropic': 'https://api.deepseek.com/anthropic/v1/messages',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta/models',
}

const selectClass = 'w-full mt-1 p-2 border rounded-md bg-background text-sm'

interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { state, dispatch } = useApp()
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [profileStatus, setProfileStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)
  const statusTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (statusTimer.current) window.clearTimeout(statusTimer.current)
    }
  }, [])

  const showStatus = (kind: 'ok' | 'error', message: string) => {
    setProfileStatus({ kind, message })
    if (statusTimer.current) window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setProfileStatus(null), 3000)
  }

  const updateDraft = (updates: Partial<typeof state.draft>) => {
    if (!state.draft) return
    dispatch({
      type: 'SET_DRAFT',
      payload: { ...state.draft, ...updates },
    })
  }

  const presets = PRESET_OPTIONS[state.draft?.providerProtocol || 'openai-compatible'] || []
  const savedProfiles = state.settings.savedProfiles || []

  const handleSaveProfile = () => {
    if (!state.draft || !state.draft.profileName.trim()) {
      showStatus('error', 'Give this connection a name first.')
      return
    }

    const profile: SavedProviderProfile = {
      id: 'profile_' + Date.now(),
      name: state.draft.profileName,
      protocol: state.draft.providerProtocol,
      endpointUrl: state.draft.endpointUrl,
      model: state.draft.model,
      apiKey: state.draft.rememberOnDevice ? state.draft.apiKey : '',
      extraHeadersJson: state.draft.extraHeadersJson,
      anthropicVersion: state.draft.anthropicVersion,
    }

    const updatedSettings = saveProviderProfile(profile, state.settings)
    dispatch({ type: 'SET_SETTINGS', payload: updatedSettings })
    dispatch({ type: 'SET_DRAFT', payload: { ...state.draft, profileName: '' } })
    showStatus('ok', `Saved "${profile.name}".`)
  }

  const handleLoadProfile = (profileId: string) => {
    setSelectedProfileId(profileId)
    if (!profileId) return

    const profile = state.settings.savedProfiles.find((p) => p.id === profileId)
    if (!profile) return

    const protocol = profile.protocol
    const preset = PRESET_OPTIONS[protocol]?.[0]?.value || ''

    updateDraft({
      providerProtocol: protocol,
      providerPreset: preset,
      endpointUrl: profile.endpointUrl,
      model: profile.model,
      apiKey: profile.apiKey || state.draft?.apiKey || '',
      extraHeadersJson: profile.extraHeadersJson,
      anthropicVersion: profile.anthropicVersion,
      profileName: profile.name,
    })
    showStatus('ok', `Loaded "${profile.name}".`)
  }

  const handleDeleteProfile = () => {
    if (!selectedProfileId) return
    const profile = state.settings.savedProfiles.find((p) => p.id === selectedProfileId)
    if (!confirm(`Delete the saved connection "${profile?.name || ''}"?`)) return

    const updatedSettings = deleteProviderProfile(selectedProfileId, state.settings)
    dispatch({ type: 'SET_SETTINGS', payload: updatedSettings })
    setSelectedProfileId('')
    showStatus('ok', 'Connection deleted.')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="settings-sheet-description">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl font-normal">Settings</SheetTitle>
          <SheetDescription id="settings-sheet-description">
            Changes save automatically on this device.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {/* Connection */}
          <section className="space-y-4">
            <h3 className="font-serif text-xl">Connection</h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="provider-protocol">Connection type</Label>
                <select
                  id="provider-protocol"
                  value={state.draft?.providerProtocol || 'openai-compatible'}
                  onChange={(e) => {
                    const newProtocol = e.target.value
                    const firstPreset = PRESET_OPTIONS[newProtocol]?.[0]?.value || ''
                    const newEndpoint = firstPreset ? (PRESET_ENDPOINTS[firstPreset] || '') : ''
                    updateDraft({
                      providerProtocol: newProtocol,
                      providerPreset: firstPreset,
                      endpointUrl: newEndpoint,
                    })
                  }}
                  className={selectClass}
                >
                  {PROTOCOL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="provider-preset">Provider</Label>
                <select
                  id="provider-preset"
                  value={state.draft?.providerPreset || 'openrouter'}
                  onChange={(e) => {
                    const newPreset = e.target.value
                    updateDraft({
                      providerPreset: newPreset,
                      endpointUrl: PRESET_ENDPOINTS[newPreset] || '',
                    })
                  }}
                  className={selectClass}
                >
                  {presets.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="provider-endpoint">Endpoint URL</Label>
                <Input
                  id="provider-endpoint"
                  type="url"
                  placeholder="https://example.com/v1/chat/completions"
                  value={state.draft?.endpointUrl || ''}
                  onChange={(e) => updateDraft({ endpointUrl: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="model-name-input">Model</Label>
                <Input
                  id="model-name-input"
                  placeholder="e.g. anthropic/claude-sonnet-5"
                  value={state.draft?.model || ''}
                  onChange={(e) => updateDraft({ model: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="api-key-input">API key</Label>
                <Input
                  id="api-key-input"
                  type="password"
                  placeholder="Optional for some gateways"
                  value={state.draft?.apiKey || ''}
                  onChange={(e) => updateDraft({ apiKey: e.target.value })}
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <Checkbox
                    id="remember-provider"
                    checked={state.draft?.rememberOnDevice || false}
                    onCheckedChange={(checked) => updateDraft({ rememberOnDevice: !!checked })}
                  />
                  <span className="text-sm">Remember my key on this device</span>
                </label>
              </div>

              {state.draft?.providerProtocol === 'anthropic-compatible' && (
                <div>
                  <Label htmlFor="anthropic-version-input">Anthropic-Version</Label>
                  <Input
                    id="anthropic-version-input"
                    placeholder="2023-06-01"
                    value={state.draft?.anthropicVersion || '2023-06-01'}
                    onChange={(e) => updateDraft({ anthropicVersion: e.target.value })}
                  />
                </div>
              )}
            </div>

            <details>
              <summary className="text-sm font-medium cursor-pointer">Extra headers (advanced)</summary>
              <div className="mt-2">
                <Label htmlFor="extra-headers-json">Additional headers (JSON)</Label>
                <Textarea
                  id="extra-headers-json"
                  rows={4}
                  placeholder='{"X-Custom-Header":"value"}'
                  value={state.draft?.extraHeadersJson || ''}
                  onChange={(e) => updateDraft({ extraHeadersJson: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">Applied after the default authentication headers.</p>
              </div>
            </details>
          </section>

          <hr />

          {/* Saved connections */}
          <section className="space-y-4">
            <h3 className="font-serif text-xl">Saved connections</h3>

            <div>
              <Label htmlFor="saved-provider-profile">Load a saved connection</Label>
              <select
                id="saved-provider-profile"
                className={selectClass}
                value={selectedProfileId}
                onChange={(e) => handleLoadProfile(e.target.value)}
              >
                <option value="">Current form</option>
                {savedProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="provider-profile-name">Save current as…</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="provider-profile-name"
                  className="mt-0"
                  placeholder="A name for this connection"
                  value={state.draft?.profileName || ''}
                  onChange={(e) => updateDraft({ profileName: e.target.value })}
                />
                <Button variant="secondary" size="sm" onClick={handleSaveProfile} className="shrink-0">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteProfile}
                  disabled={!selectedProfileId}
                  className="shrink-0"
                  aria-label="Delete selected connection"
                  title="Delete selected connection"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p
              role="status"
              className={
                profileStatus
                  ? profileStatus.kind === 'ok'
                    ? 'text-sm text-success'
                    : 'text-sm text-destructive'
                  : 'sr-only'
              }
            >
              {profileStatus?.message || ''}
            </p>
          </section>

          <hr />

          {/* Translation style */}
          <section className="space-y-4">
            <h3 className="font-serif text-xl">Translation style</h3>

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
                rows={7}
                placeholder="Add tone, terminology, or domain-specific guidance if needed."
                value={state.draft?.customInstruction || ''}
                onChange={(e) => updateDraft({ customInstruction: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="novel-mode-toggle"
                  checked={state.draft?.novelModeEnabled ?? true}
                  onCheckedChange={(checked) => updateDraft({ novelModeEnabled: !!checked })}
                />
                <span className="text-sm">Novel mode for long-form fiction</span>
              </label>
              <p className="text-sm text-muted-foreground pl-6">
                For <code>.txt</code> and <code>.md</code>: reads ahead first, then keeps character names and
                recurring terms consistent across the whole book.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Recovery is always enabled: each part gets up to five retries, then a safe format-aware rescue split when possible.
            </p>
          </section>

          <hr />

          {/* Splitting & speed */}
          <section className="space-y-4">
            <h3 className="font-serif text-xl">Splitting &amp; speed</h3>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="auto-split-toggle"
                checked={state.draft?.autoSplit ?? true}
                onCheckedChange={(checked) => updateDraft({ autoSplit: !!checked })}
              />
              <span className="text-sm">Choose part size automatically</span>
            </label>

            <details>
              <summary className="text-sm font-medium cursor-pointer">Manual tuning (advanced)</summary>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-chars-per-chunk">Max characters per part</Label>
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
                    <Label htmlFor="max-parallel-chunks">Parts translated at once</Label>
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
                  If the provider starts rate-limiting, parallel translation automatically falls back to one part
                  at a time. Overlap lines are used as continuity hints between parts.
                </p>
              </div>
            </details>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
