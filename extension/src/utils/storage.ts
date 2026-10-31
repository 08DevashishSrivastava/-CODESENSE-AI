import { DEFAULT_SETTINGS, UserSettings } from '../types/settings';

const STORAGE_KEY = 'codesense_ai_settings';

export class SettingsStorage {
  static async getSettings(): Promise<UserSettings> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const result = await chrome.storage.sync.get([STORAGE_KEY]);
        if (result && result[STORAGE_KEY]) {
          return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        }
      }
    } catch (err) {
      console.warn('[CodeSense AI] Failed to read settings from storage, using defaults:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  static async saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const current = await this.getSettings();
      const updated: UserSettings = { ...current, ...settings };
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    } catch (err) {
      console.error('[CodeSense AI] Failed to save settings:', err);
      throw err;
    }
  }

  static subscribe(callback: (settings: UserSettings) => void): () => void {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'sync' && changes[STORAGE_KEY]) {
          callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEY].newValue });
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    return () => {};
  }
}
