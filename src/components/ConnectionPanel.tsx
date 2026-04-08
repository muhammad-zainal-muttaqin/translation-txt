import { useApp, getDefaultDraft } from '../contexts/AppContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Settings, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { saveProviderProfile, deleteProviderProfile, saveSettings, loadSettings } from '../lib/storage'
import type { SavedProviderProfile } from '../types'

const PROTOCOL_OPTIONS = [
  { value: 'openai-compatible', label: 'OpenAI-compatible' },
  { value: 'anthropic-compatible', label: 'Anthropic-compatible' },
  { value: 'gemini', label: 'Google Gemini' },
]

const PRESET_OPTIONS: Record<string, { value: string; label: string }[]> = {
  'openai-compatible': [
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'fireworks-openai', label: 'Fireworks' },
    { value: 'xai', label: 'xAI' },
    { value: 'minimax-openai', label: 'MiniMax' },
    { value: 'openai', label: 'OpenAI' },
  ],
  'anthropic-compatible': [
    { value: 'anthropic', label: 'Anthropic' },
  ],
  'gemini': [
    { value: 'gemini', label: 'Google Gemini' },
  ],
}

const PRESET_ENDPOINTS: Record<string, string> = {
  'openrouter': 'https://openrouter.ai/api/v1/chat/completions',
  'fireworks-openai': 'https://api.fireworks.ai/inference/v1/chat/completions',
  'xai': 'https://api.x.ai/v1/chat/completions',
  'minimax-openai': 'https://api.minimax.io/v1/chat/completions',
  'openai': 'https://api.openai.com/v1/chat/completions',
  'anthropic': 'https://api.anthropic.com/v1/messages',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta/models',
}

export function ConnectionPanel() {
  const { state, dispatch } = useApp()
  const [selectedProfileId, setSelectedProfileId] = useState('')

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

  const presets = PRESET_OPTIONS[state.draft?.providerProtocol || 'openai-compatible'] || []

  const handleSaveProfile = () => {
    if (!state.draft || !state.draft.profileName.trim()) {
      alert('Please enter a profile name')
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
    alert('Profile saved: ' + profile.name)
  }

  const handleLoadProfile = (profileId: string) => {
    if (!profileId) return
    
    setSelectedProfileId(profileId)
    const profile = state.settings.savedProfiles.find(p => p.id === profileId)
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
  }

  const handleDeleteProfile = () => {
    if (!selectedProfileId) {
      alert('Please select a profile to delete')
      return
    }

    if (!confirm('Are you sure you want to delete this profile?')) return

    const updatedSettings = deleteProviderProfile(selectedProfileId, state.settings)
    dispatch({ type: 'SET_SETTINGS', payload: updatedSettings })
    setSelectedProfileId('')
    alert('Profile deleted')
  }

  const savedProfiles = state.settings.savedProfiles || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
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
                  endpointUrl: newEndpoint
                })
              }}
              className="w-full mt-1 p-2 border rounded-md bg-background"
            >
              {PROTOCOL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="provider-preset">Preset</Label>
            <select
              id="provider-preset"
              value={state.draft?.providerPreset || 'openrouter'}
              onChange={(e) => {
                const newPreset = e.target.value
                updateDraft({ 
                  providerPreset: newPreset,
                  endpointUrl: PRESET_ENDPOINTS[newPreset] || ''
                })
              }}
              className="w-full mt-1 p-2 border rounded-md bg-background"
            >
              {presets.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
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

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="model-name-input">Model</Label>
            <Input
              id="model-name-input"
              placeholder="Provider model id"
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
          </div>
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

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Profiles</h4>
          <div className="grid md:grid-cols-2 gap-4 mb-3">
            <div>
              <Label htmlFor="saved-provider-profile">Load</Label>
              <select
                id="saved-provider-profile"
                className="w-full mt-1 p-2 border rounded-md bg-background"
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
              <Label htmlFor="provider-profile-name">Save as</Label>
              <Input
                id="provider-profile-name"
                placeholder="Label for this configuration"
                value={state.draft?.profileName || ''}
                onChange={(e) => updateDraft({ profileName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-provider"
                checked={state.draft?.rememberOnDevice || false}
                onChange={(e) => updateDraft({ rememberOnDevice: e.target.checked })}
              />
              <span className="text-sm">Persist API key on this device</span>
            </label>

            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" size="sm" onClick={handleSaveProfile}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeleteProfile} disabled={!selectedProfileId}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <details className="cursor-pointer">
          <summary className="font-medium">Extra headers (JSON)</summary>
          <div className="mt-2">
            <Label htmlFor="extra-headers-json">Additional headers</Label>
            <Textarea
              id="extra-headers-json"
              rows={4}
              placeholder='{"X-Custom-Header":"value"}'
              value={state.draft?.extraHeadersJson || ''}
              onChange={(e) => updateDraft({ extraHeadersJson: e.target.value })}
            />
            <p className="text-sm text-muted-foreground mt-1">Applied after default authentication headers.</p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
