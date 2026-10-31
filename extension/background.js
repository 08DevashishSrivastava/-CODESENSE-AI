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
  voiceMessageOverride: 'Kya code likh raha hai bhai? '
};

const ANALYSIS_TIMEOUT_MS = 6000;

function getBackendUrl(settings) {
  return (settings.backendUrl || DEFAULT_SETTINGS.backendUrl).replace(/\/$/, '');
}

function mergeSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function sendJsonResponse(response, sendResponse) {
  if (!response.ok) {
    throw new Error(`Backend responded with HTTP ${response.status}`);
  }
  return response.json().then(sendResponse);
}

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
      sendResponse(mergeSettings(result.settings));
    });
    return true;
  }

  if (message.type === 'saveSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = mergeSettings({ ...result.settings, ...(message.settings || {}) });
      chrome.storage.local.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true, settings });
      });
    });
    return true;
  }

  if (message.type === 'checkBackend') {
    const backendUrl = getBackendUrl(message.settings || {});
    fetch(`${backendUrl}/health`)
      .then((response) => sendJsonResponse(response, (data) => sendResponse({ success: true, data })))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'analyzeCode') {
    const settings = mergeSettings(message.settings);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

    fetch(`${getBackendUrl(settings)}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        language: message.language,
        code: message.code,
        problem_context: message.problemContext || {},
        code_version: Math.max(1, Number(message.codeVersion) || 1)
      }),
      signal: controller.signal
    })
      .then((response) => sendJsonResponse(response, sendResponse))
      .catch((error) => sendResponse({
        success: false,
        diagnostics: [],
        analysis_status: 'failed',
        error: error.name === 'AbortError' ? 'Analysis request timed out.' : error.message
      }))
      .finally(() => clearTimeout(timeoutId));
    return true;
  }

  return false;
});
