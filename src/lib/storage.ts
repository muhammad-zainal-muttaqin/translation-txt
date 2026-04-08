import { Settings, DraftSettings, ActiveRun } from '../types';
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
