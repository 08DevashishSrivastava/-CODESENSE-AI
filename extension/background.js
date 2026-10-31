const DEFAULT_SETTINGS = {
  enabled: true,
  voiceEnabled: true,
  voiceLanguage: 'en-IN',
  voicePersonality: 'professional',
  profanityEnabled: false,
  speechRate: 1,
  speechVolume: 0.8,
  analysisMode: 'balanced',
  backendUrl: 'http://localhost:8000',
  supportedLanguages: ['python', 'java', 'javascript', 'cpp', 'c'],
  voiceMessageOverride: ''
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (message.type === 'saveSettings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'analyzeCode') {
    const settings = message.settings || DEFAULT_SETTINGS;
    fetch(`${settings.backendUrl}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: message.language,
        code: message.code,
        problem_context: message.problemContext || {},
        code_version: message.codeVersion || 0
      })
    })
      .then((response) => response.json())
      .then((payload) => sendResponse(payload))
      .catch(() => sendResponse({ success: true, diagnostics: [], analysis_status: 'completed' }));
    return true;
  }

  return false;
});
