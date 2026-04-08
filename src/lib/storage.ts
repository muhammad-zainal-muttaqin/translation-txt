import { Settings, DraftSettings, ActiveRun, SavedProviderProfile, LogEntry } from '../types';
import { STORAGE_KEYS } from '../types';

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.settings);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {
    version: 1,
    migrationVersion: 1,
    rememberedDraft: null,
    savedProfiles: []
  };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadActiveRun(): ActiveRun | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.activeRun);
    if (stored) {
      return JSON.parse(stored);
    }
    const fallback = localStorage.getItem(STORAGE_KEYS.activeRunFallback);
    if (fallback) {
      return JSON.parse(fallback);
    }
  } catch (e) {
    console.error('Failed to load active run:', e);
  }
  return null;
}

export function saveActiveRun(run: ActiveRun | null): void {
  try {
    if (run) {
      localStorage.setItem(STORAGE_KEYS.activeRun, JSON.stringify(run));
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeRun);
      localStorage.removeItem(STORAGE_KEYS.activeRunFallback);
    }
  } catch (e) {
    console.error('Failed to save active run:', e);
  }
}

export function getDraftFromSettings(settings: Settings, protocol: string, preset: string): DraftSettings | null {
  if (settings.rememberedDraft) {
    return settings.rememberedDraft;
  }
  return null;
}

export function saveProviderProfile(profile: SavedProviderProfile, settings: Settings): Settings {
  const existing = settings.savedProfiles.findIndex(p => p.id === profile.id);
  const savedProfiles = existing >= 0
    ? settings.savedProfiles.map((p, i) => (i === existing ? profile : p))
    : [...settings.savedProfiles, profile];
  const next: Settings = { ...settings, savedProfiles };
  saveSettings(next);
  return next;
}

export function deleteProviderProfile(profileId: string, settings: Settings): Settings {
  const next: Settings = {
    ...settings,
    savedProfiles: settings.savedProfiles.filter(p => p.id !== profileId),
  };
  saveSettings(next);
  return next;
}

export function saveRememberedDraft(draft: DraftSettings, settings: Settings): Settings {
  const next: Settings = { ...settings, rememberedDraft: draft };
  saveSettings(next);
  return next;
}

export function clearRememberedDraft(settings: Settings): Settings {
  const next: Settings = { ...settings, rememberedDraft: null };
  saveSettings(next);
  return next;
}

export function normalizeRunOnLoad(run: ActiveRun): ActiveRun {
  const inFlightStates = ['running', 'paused', 'aborted'];
  
  if (inFlightStates.includes(run.status)) {
    run.status = 'paused';
  }
  
  return run;
}

export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getSessionLogs(): LogEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.session);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load session logs:', e);
  }
  return [];
}

export function saveSessionLogs(logs: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(logs.slice(-500)));
  } catch (e) {
    console.error('Failed to save session logs:', e);
  }
}

type LogSubscriber = (entry: LogEntry) => void;
const logSubscribers = new Set<LogSubscriber>();

export function subscribeToSessionLogs(fn: LogSubscriber): () => void {
  logSubscribers.add(fn);
  return () => {
    logSubscribers.delete(fn);
  };
}

export function addSessionLog(message: string, level: LogEntry['level'] = 'info'): void {
  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    message,
  };
  const logs = getSessionLogs();
  logs.push(entry);
  saveSessionLogs(logs);
  logSubscribers.forEach(fn => {
    try {
      fn(entry);
    } catch (e) {
      console.error('Log subscriber error:', e);
    }
  });
}

export function clearSessionLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.session);
  } catch (e) {
    console.error('Failed to clear session logs:', e);
  }
}
