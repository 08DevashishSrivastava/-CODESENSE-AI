const DEFAULTS = {
  enabled: true,
  voiceEnabled: true,
  voiceLanguage: 'en-IN',
  voicePersonality: 'professional',
  profanityEnabled: false,
  speechRate: 1,
  speechVolume: 0.8,
  analysisMode: 'balanced',
  backendUrl: 'http://localhost:8000',
  voiceMessageOverride: ''
};

const els = {
  enabled: document.getElementById('enabled'),
  voiceEnabled: document.getElementById('voiceEnabled'),
  voiceLanguage: document.getElementById('voiceLanguage'),
  voicePersonality: document.getElementById('voicePersonality'),
  profanityEnabled: document.getElementById('profanityEnabled'),
  speechRate: document.getElementById('speechRate'),
  speechVolume: document.getElementById('speechVolume'),
  analysisMode: document.getElementById('analysisMode'),
  backendUrl: document.getElementById('backendUrl'),
  voiceMessageOverride: document.getElementById('voiceMessageOverride'),
  saveButton: document.getElementById('saveButton'),
  status: document.getElementById('status')
};

function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = { ...DEFAULTS, ...(result.settings || {}) };
    Object.entries({
      enabled: settings.enabled,
      voiceEnabled: settings.voiceEnabled,
      voiceLanguage: settings.voiceLanguage,
      voicePersonality: settings.voicePersonality,
      speechRate: settings.speechRate,
      speechVolume: settings.speechVolume,
      analysisMode: settings.analysisMode,
      backendUrl: settings.backendUrl,
      voiceMessageOverride: settings.voiceMessageOverride
    }).forEach(([key, value]) => {
      if (els[key]) {
        if (typeof value === 'boolean') {
          els[key].checked = value;
        } else {
          els[key].value = value || '';
        }
      }
    });
    els.profanityEnabled.checked = Boolean(settings.profanityEnabled);
  });
}

function saveSettings() {
  const settings = {
    ...DEFAULTS,
    enabled: els.enabled.checked,
    voiceEnabled: els.voiceEnabled.checked,
    voiceLanguage: els.voiceLanguage.value,
    voicePersonality: els.voicePersonality.value,
    profanityEnabled: els.profanityEnabled.checked,
    speechRate: Number(els.speechRate.value),
    speechVolume: Number(els.speechVolume.value),
    analysisMode: els.analysisMode.value,
    backendUrl: els.backendUrl.value,
    voiceMessageOverride: els.voiceMessageOverride.value
  };

  chrome.storage.local.set({ settings }, () => {
    els.status.textContent = 'Settings saved.';
    els.status.classList.add('success');
    setTimeout(() => {
      els.status.textContent = '';
      els.status.classList.remove('success');
    }, 1400);
  });
}

els.saveButton.addEventListener('click', saveSettings);
loadSettings();
