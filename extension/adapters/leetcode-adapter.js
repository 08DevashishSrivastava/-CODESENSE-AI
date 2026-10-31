class LeetCodeAdapter extends window.CodeSenseBaseAdapter {
  constructor() {
    super('leetcode');
  }

  detectPlatform() {
    return /leetcode\.com/i.test(window.location.hostname);
  }

  detectEditor() {
    const monacoEditor = window.monaco && window.monaco.editor && Array.isArray(window.monaco.editor.getEditors())
      ? window.monaco.editor.getEditors()[0]
      : null;
    if (monacoEditor) {
      return monacoEditor;
    }

    const editor = document.querySelector('.CodeMirror') || document.querySelector('.cm-editor');
    return editor || document.querySelector('textarea');
  }

  getCode() {
    const editor = this.detectEditor();
    if (editor && typeof editor.getModel === 'function') {
      return editor.getModel().getValue();
    }
    if (editor && editor.CodeMirror) {
      return editor.CodeMirror.getValue();
    }
    if (editor && editor.value) {
      return editor.value;
    }
    return '';
  }

  getLanguage() {
    const languageSelector = document.querySelector('[data-language]') || document.querySelector('#lang-select');
    if (languageSelector) {
      return (languageSelector.dataset.language || languageSelector.value || 'python').toLowerCase();
    }
    return 'python';
  }

  getProblemContext() {
    const title = document.querySelector('h1, .title, .question-title')?.textContent?.trim() || '';
    const description = document.querySelector('.description, .markdown, .content__u3I1')?.textContent?.trim() || '';
    return { title, description, constraints: '' };
  }

  subscribeToChanges(callback) {
    const editor = this.detectEditor();
    if (editor && typeof editor.onDidChangeModelContent === 'function') {
      return editor.onDidChangeModelContent(() => callback());
    }
    const observer = new MutationObserver(() => callback());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return observer;
  }

  applyDiagnostics(diagnostics) {
    const editor = this.detectEditor();
    if (editor && typeof editor.getModel === 'function' && typeof window.monaco?.editor?.setModelMarkers === 'function') {
      const model = editor.getModel();
      const markers = diagnostics.map((item) => ({
        startLineNumber: Number(item.line || 1),
        startColumn: Number(item.start_column || 1),
        endLineNumber: Number(item.line || 1),
        endColumn: Number(item.end_column || item.start_column + 5),
        severity: item.severity === 'warning' ? window.monaco.MarkerSeverity.Warning : window.monaco.MarkerSeverity.Error,
        message: item.message,
        source: item.source || 'CodeSense AI'
      }));
      window.monaco.editor.setModelMarkers(model, 'codesense-ai', markers);
    }
  }

  clearDiagnostics() {
    const editor = this.detectEditor();
    if (editor && typeof editor.getModel === 'function' && typeof window.monaco?.editor?.setModelMarkers === 'function') {
      window.monaco.editor.setModelMarkers(editor.getModel(), 'codesense-ai', []);
    }
  }
}

window.CodeSenseLeetCodeAdapter = LeetCodeAdapter;
