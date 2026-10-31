const DEFAULT_SETTINGS = {
  enabled: true,
  voiceEnabled: true,
  voiceLanguage: 'en-IN',
  voicePersonality: 'professional',
  profanityEnabled: false,
  speechRate: 1,
  speechVolume: 0.8,
  analysisMode: 'balanced',
  voiceMessageOverride: ''
};

const PLATFORM_MATCHES = {
  leetcode: /leetcode\.com/i,
  gfg: /geeksforgeeks\.org/i,
  hackerrank: /hackerrank\.com/i,
  codechef: /codechef\.com/i,
  codeforces: /codeforces\.com/i
};

const state = {
  platform: null,
  editor: null,
  lastDiagnostics: [],
  lastFingerprint: null,
  debounceTimer: null,
  alertCooldown: 5000,
  lastAlertAt: 0,
  analyzing: false,
  settings: DEFAULT_SETTINGS,
  modelMarkers: []
};

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...(result.settings || {}) });
    });
  });
}

function detectPlatform() {
  const adapter = window.CodeSenseAdapterRegistry && window.CodeSenseAdapterRegistry.getCurrentAdapter ? window.CodeSenseAdapterRegistry.getCurrentAdapter() : null;
  if (adapter && typeof adapter.detectPlatform === 'function' && adapter.detectPlatform()) {
    return adapter.name || 'leetcode';
  }

  const host = window.location.hostname;
  for (const [name, regex] of Object.entries(PLATFORM_MATCHES)) {
    if (regex.test(host)) {
      return name;
    }
  }
  return 'unknown';
}

function isMonacoEditor(editor) {
  return Boolean(editor && typeof editor.getModel === 'function');
}

function detectEditor() {
  const adapter = window.CodeSenseAdapterRegistry && window.CodeSenseAdapterRegistry.getCurrentAdapter ? window.CodeSenseAdapterRegistry.getCurrentAdapter() : null;
  if (adapter && typeof adapter.detectEditor === 'function') {
    const resolved = adapter.detectEditor();
    if (resolved) {
      return resolved;
    }
  }

  if (window.monaco && window.monaco.editor && Array.isArray(window.monaco.editor.getEditors())) {
    const editors = window.monaco.editor.getEditors();
    if (editors.length) {
      return editors[0];
    }
  }

  const cm = document.querySelector('.CodeMirror') || document.querySelector('.cm-editor');
  if (cm) {
    return cm;
  }

  const textarea = document.querySelector('textarea, textarea[aria-label]');
  if (textarea) {
    return textarea;
  }

  return null;
}

function getCodeFromMonaco(editor) {
  if (!editor || !editor.getModel) return '';
  return editor.getModel().getValue();
}

function getCodeFromCodeMirror(editor) {
  if (!editor) return '';
  if (editor.CodeMirror) {
    return editor.CodeMirror.getValue();
  }
  if (editor.value) {
    return editor.value;
  }
  return '';
}

function getCodeFromTextarea(textarea) {
  return textarea ? textarea.value : '';
}

function getCurrentLanguage() {
  const adapter = window.CodeSenseAdapterRegistry && window.CodeSenseAdapterRegistry.getCurrentAdapter ? window.CodeSenseAdapterRegistry.getCurrentAdapter() : null;
  if (adapter && typeof adapter.getLanguage === 'function') {
    const language = adapter.getLanguage();
    if (language) {
      return language.toLowerCase();
    }
  }

  const text = document.body.innerText || '';
  if (text.toLowerCase().includes('python')) return 'python';
  if (text.toLowerCase().includes('java')) return 'java';
  if (text.toLowerCase().includes('c++')) return 'cpp';
  if (text.toLowerCase().includes('javascript')) return 'javascript';
  return 'python';
}

function getProblemContext() {
  const adapter = window.CodeSenseAdapterRegistry && window.CodeSenseAdapterRegistry.getCurrentAdapter ? window.CodeSenseAdapterRegistry.getCurrentAdapter() : null;
  if (adapter && typeof adapter.getProblemContext === 'function') {
    const context = adapter.getProblemContext();
    if (context) {
      return context;
    }
  }

  const heading = document.querySelector('h1, h2, .title, .question-title')?.textContent || '';
  const description = document.querySelector('.description, .content, .problem-description')?.textContent || '';
  return { title: heading, description, constraints: '' };
}

function dedupeDiagnostics(diagnostics) {
  const seen = new Set();
  return diagnostics.filter((item) => {
    const key = `${item.line}:${item.start_column}:${item.end_column}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function analyzeCode() {
  if (!state.settings.enabled) return;
  const platform = detectPlatform();
  const editor = detectEditor();
  if (!editor) return;

  let code = '';
  const adapter = window.CodeSenseAdapterRegistry && window.CodeSenseAdapterRegistry.getCurrentAdapter ? window.CodeSenseAdapterRegistry.getCurrentAdapter() : null;
  if (adapter && typeof adapter.getCode === 'function') {
    code = adapter.getCode();
  }
  if (!code) {
    if (isMonacoEditor(editor)) {
      code = getCodeFromMonaco(editor);
    } else if (editor.CodeMirror) {
      code = getCodeFromCodeMirror(editor);
    } else if (editor.tagName === 'TEXTAREA') {
      code = getCodeFromTextarea(editor);
    }
  }

  const language = getCurrentLanguage();
  const data = {
    language,
    code,
    problem_context: getProblemContext(),
    code_version: Date.now()
  };

  state.analyzing = true;
  try {
    const response = await fetch(`${state.settings.backendUrl || 'http://localhost:8000'}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const payload = await response.json();
    const diagnostics = dedupeDiagnostics(payload.diagnostics || []);
    state.lastDiagnostics = diagnostics;
    applyDiagnostics(diagnostics);
    triggerVoiceIfNeeded(diagnostics);
  } catch (error) {
    const fallback = localStaticDiagnostics(code, language);
    state.lastDiagnostics = fallback;
    applyDiagnostics(fallback);
    triggerVoiceIfNeeded(fallback);
  } finally {
    state.analyzing = false;
  }
}

function localStaticDiagnostics(code, language) {
  const diagnostics = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if ((language === 'python' && /def |class |if |for |while /.test(trimmed) && !trimmed.endsWith(':')) || (['java', 'javascript', 'cpp', 'c'].includes(language) && /if\s*\(|for\s*\(|while\s*\(/.test(trimmed) && !trimmed.includes(';') && !trimmed.includes('{') && !trimmed.includes(')')) {
      diagnostics.push({
        id: `local-${index + 1}`,
        line: index + 1,
        start_column: 1,
        end_column: Math.max(1, trimmed.length),
        message: 'Possible syntax issue detected. Review the control structure before continuing.',
        severity: 'warning',
        category: 'syntax',
        source: 'local',
        confidence: 0.75
      });
    }
  });

  return diagnostics;
}

function applyDiagnostics(diagnostics) {
  if (!Array.isArray(diagnostics) || !diagnostics.length) {
    state.lastFingerprint = null;
    clearDiagnostics();
    return;
  }

  const adapter = window.CodeSenseAdapterRegistry && window.CodeSenseAdapterRegistry.getCurrentAdapter ? window.CodeSenseAdapterRegistry.getCurrentAdapter() : null;
  if (adapter && typeof adapter.applyDiagnostics === 'function') {
    adapter.applyDiagnostics(diagnostics);
    return;
  }

  if (isMonacoEditor(state.editor)) {
    const model = state.editor.getModel();
    if (!model) return;
    const markers = diagnostics.map((diagnostic) => ({
      startLineNumber: Number(diagnostic.line || 1),
      startColumn: Number(diagnostic.start_column || 1),
      endLineNumber: Number(diagnostic.line || 1),
      endColumn: Number(diagnostic.end_column || diagnostic.start_column + 5),
      severity: diagnostic.severity === 'warning' ? window.monaco.MarkerSeverity.Warning : window.monaco.MarkerSeverity.Error,
      message: diagnostic.message,
      source: diagnostic.source || 'CodeSense AI'
    }));
    window.monaco.editor.setModelMarkers(model, 'codesense-ai', markers);
    return;
  }

  const lines = Array.from(document.querySelectorAll('.CodeMirror-line, .cm-line, .monaco-editor-background'));
  lines.forEach((node, index) => {
    if (diagnostics.some((item) => item.line === index + 1)) {
      node.style.borderBottom = '1px solid rgba(255, 76, 76, 0.9)';
    } else {
      node.style.borderBottom = '';
    }
  });
}

function clearDiagnostics() {
  const adapter = window.CodeSenseAdapterRegistry && window.CodeSenseAdapterRegistry.getCurrentAdapter ? window.CodeSenseAdapterRegistry.getCurrentAdapter() : null;
  if (adapter && typeof adapter.clearDiagnostics === 'function') {
    adapter.clearDiagnostics();
    return;
  }

  if (isMonacoEditor(state.editor)) {
    const model = state.editor.getModel();
    if (model) {
      window.monaco.editor.setModelMarkers(model, 'codesense-ai', []);
    }
    return;
  }

  document.querySelectorAll('.CodeMirror-line, .cm-line').forEach((node) => {
    node.style.borderBottom = '';
  });
}

function buildVoiceMessage(diagnostic, personality = 'professional', profanityEnabled = false, customMessage = '') {
  if (customMessage && customMessage.trim()) {
    return customMessage.trim();
  }

  const message = diagnostic.message || 'Possible issue detected.';
  const lower = message.toLowerCase();

  if (personality === 'roast') {
    if (/loop|condition/.test(lower)) {
      return profanityEnabled ? 'Abe laude, ye line galat likh di! Loop condition check kar!' : 'Bhai, ye line galat likh di! Loop condition check kar!';
    }
    if (/array|index/.test(lower)) {
      return 'Oye laude, array ki length se bahar mat ja!';
    }
    if (/return/.test(lower)) {
      return 'Bhai kya kar raha hai? Ye return statement galat hai!';
    }
    if (/variable|undefined/.test(lower)) {
      return 'Kya code likh raha hai bhai? Ye variable declare hi nahi kiya!';
    }
    if (/infinite/.test(lower)) {
      return 'Oye coder, infinite loop bana diya kya?';
    }
    if (/bracket|closing|missing/.test(lower)) {
      return 'Bhai, bracket band karna bhool gaya!';
    }
    return profanityEnabled ? `Abe laude, ye line galat likh di! ${message}` : `Bhai, ye line galat likh di! ${message}`;
  }

  if (personality === 'friendly') {
    if (/loop|condition/.test(lower)) {
      return 'Bhai, yahan loop condition check kar lo. Kuch galat lag raha hai.';
    }
    if (/array|index/.test(lower)) {
      return 'Bhai, array index ki boundary check kar lo.';
    }
    if (/return/.test(lower)) {
      return 'Bhai, return statement ko dobara dekh lo. Kuch galat lag raha hai.';
    }
    if (/variable|undefined/.test(lower)) {
      return 'Bhai, ye variable declare ya define hai ki nahi check kar lo.';
    }
    return `Bhai, line ${diagnostic.line || 1} par kuch dikkat lag rahi hai. ${message}`;
  }

  return `Warning! ${message} on line ${diagnostic.line || 1}.`;
}

function triggerVoiceIfNeeded(diagnostics) {
  if (!state.settings.voiceEnabled || !('speechSynthesis' in window)) return;
  const now = Date.now();
  if (now - state.lastAlertAt < state.alertCooldown) return;

  const alert = diagnostics.find((item) => Number(item.confidence || 0) >= 0.7 && item.severity !== 'info');
  if (!alert) return;

  const fingerprint = `${alert.line}:${alert.message}:${alert.category}`;
  if (state.lastFingerprint === fingerprint) return;

  const personality = state.settings.voicePersonality || 'professional';
  const message = buildVoiceMessage(alert, personality, Boolean(state.settings.profanityEnabled), state.settings.voiceMessageOverride || '');
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = state.settings.voiceLanguage || 'en-IN';
  utterance.rate = Number(state.settings.speechRate || 1);
  utterance.volume = Number(state.settings.speechVolume || 0.8);
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  state.lastAlertAt = now;
  state.lastFingerprint = fingerprint;
}

function installMutationMonitoring() {
  const observer = new MutationObserver(() => {
    if (state.analyzing) return;
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => analyzeCode(), 350);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return observer;
}

async function init() {
  state.settings = await getSettings();
  state.platform = detectPlatform();
  state.editor = detectEditor();
  if (state.editor) {
    if (isMonacoEditor(state.editor)) {
      state.editor.onDidChangeModelContent(() => {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => analyzeCode(), 400);
      });
    } else {
      installMutationMonitoring();
    }
    analyzeCode();
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
