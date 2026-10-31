import { DEFAULT_SETTINGS } from '../types/settings';

const STORAGE_KEY = 'codesense_ai_settings';

chrome.runtime.onInstalled.addListener(async (details) => {
  console.info('[CodeSense AI] Service worker installed, reason:', details.reason);
  
  // Initialize default settings if absent
  try {
    const existing = await chrome.storage.sync.get([STORAGE_KEY]);
    if (!existing || !existing[STORAGE_KEY]) {
      await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
      console.info('[CodeSense AI] Initialized default settings in storage.');
    }
  } catch (err) {
    console.warn('[CodeSense AI] Error initializing storage:', err);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CODESENSE_CHECK_BACKEND') {
    fetch(`${message.backendUrl || 'http://localhost:8000'}/health`)
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

