/**
 * CodeSense AI - Page-World Bridge (MAIN world)
 * Runs safely in the page's execution context to interface with
 * Monaco Editor and CodeMirror instances without exposing private data.
 */

(function () {
  const SCRIPT_NAME = 'CodeSense Bridge';
  let activeMonacoEditor: any = null;
  let activeMonacoDecorations: string[] = [];
  let activeCodeMirror5: any = null;
  let activeCodeMirrorMarks: any[] = [];
  let isListening = false;
  let currentVersion = 1;

  function log(...args: any[]) {
    console.debug(`[${SCRIPT_NAME}]`, ...args);
  }

  // Inject custom CSS for non-destructive, subtle squiggly underline
  function injectDecorationStyles() {
    if (document.getElementById('codesense-bridge-styles')) return;
    const style = document.createElement('style');
    style.id = 'codesense-bridge-styles';
    style.textContent = `
      .codesense-squiggly-error {
        text-decoration: underline wavy #EF4444 1.5px !important;
        text-underline-offset: 3px !important;
        background-color: rgba(239, 68, 68, 0.08) !important;
        border-radius: 2px !important;
        transition: background-color 0.2s ease;
      }
      .codesense-squiggly-warning {
        text-decoration: underline wavy #F59E0B 1.5px !important;
        text-underline-offset: 3px !important;
        background-color: rgba(245, 158, 11, 0.08) !important;
        border-radius: 2px !important;
      }
      .codesense-line-marker {
        background: linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, transparent 100%);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Find Monaco Editor instance
  function getMonacoEditor(): any {
    if (activeMonacoEditor) return activeMonacoEditor;
    const monaco = (window as any).monaco;
    if (monaco && monaco.editor && typeof monaco.editor.getEditors === 'function') {
      const editors = monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        // Return focused or first non-diff editor
        for (const ed of editors) {
          if (ed.getModel() && !ed.getModel().isDisposed()) {
            activeMonacoEditor = ed;
            return ed;
          }
        }
      }
    }
    return null;
  }

  // Find CodeMirror 5 instance
  function getCodeMirror5(): any {
    if (activeCodeMirror5) return activeCodeMirror5;
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement && (cmElement as any).CodeMirror) {
      activeCodeMirror5 = (cmElement as any).CodeMirror;
      return activeCodeMirror5;
    }
    return null;
  }

  // Find CodeMirror 6 instance
  function getCodeMirror6(): any {
    const cm6Element = document.querySelector('.cm-editor');
    if (cm6Element && (cm6Element as any).cmView && (cm6Element as any).cmView.view) {
      return (cm6Element as any).cmView.view;
    }
    return null;
  }

  // Read current code from discovered editor
  function readCode(): { code: string; language: string; editorType: string } {
    const monacoEd = getMonacoEditor();
    if (monacoEd) {
      const model = monacoEd.getModel();
      if (model) {
        return {
          code: model.getValue(),
          language: model.getLanguageId ? model.getLanguageId() : 'unknown',
          editorType: 'monaco'
        };
      }
    }

    const cm5 = getCodeMirror5();
    if (cm5) {
      const mode = cm5.getMode ? cm5.getMode().name : 'unknown';
      return {
        code: cm5.getValue(),
        language: mode,
        editorType: 'codemirror5'
      };
    }

    const cm6 = getCodeMirror6();
    if (cm6 && cm6.state && cm6.state.doc) {
      return {
        code: cm6.state.doc.toString(),
        language: 'unknown',
        editorType: 'codemirror6'
      };
    }

    return { code: '', language: 'unknown', editorType: 'none' };
  }

  // Apply Monaco decorations
  function applyMonacoDecorations(diagnostics: any[]) {
    const ed = getMonacoEditor();
    const monaco = (window as any).monaco;
    if (!ed || !monaco || !ed.getModel()) return;

    const model = ed.getModel();
    const lineCount = model.getLineCount();

    const newDecorations = (diagnostics || []).map((diag) => {
      const safeLine = Math.max(1, Math.min(diag.line || 1, lineCount));
      const lineLength = model.getLineLength(safeLine);
      const startCol = Math.max(1, Math.min(diag.start_column || 1, lineLength + 1));
      const endCol = Math.max(startCol + 1, Math.min(diag.end_column || lineLength + 1, lineLength + 1));

      const isError = diag.severity === 'error';
      const cssClass = isError ? 'codesense-squiggly-error' : 'codesense-squiggly-warning';

      return {
        range: new monaco.Range(safeLine, startCol, safeLine, endCol),
        options: {
          isWholeLine: false,
          inlineClassName: cssClass,
          hoverMessage: {
            value: `**CodeSense AI (${diag.category.toUpperCase()})**\n\n${diag.message}`
          },
          minimap: {
            color: isError ? '#EF4444' : '#F59E0B',
            position: 1
          }
        }
      };
    });

    activeMonacoDecorations = ed.deltaDecorations(activeMonacoDecorations, newDecorations);
  }

  // Clear Monaco decorations
  function clearMonacoDecorations() {
    const ed = getMonacoEditor();
    if (ed && activeMonacoDecorations.length > 0) {
      activeMonacoDecorations = ed.deltaDecorations(activeMonacoDecorations, []);
    }
  }

  // Apply CodeMirror 5 decorations
  function applyCodeMirror5Decorations(diagnostics: any[]) {
    const cm = getCodeMirror5();
    if (!cm) return;

    clearCodeMirror5Decorations();

    for (const diag of diagnostics || []) {
      const line = Math.max(0, (diag.line || 1) - 1); // CM5 is 0-based
      const startCol = Math.max(0, (diag.start_column || 1) - 1);
      const lineContent = cm.getLine(line) || '';
      const endCol = Math.max(startCol + 1, Math.min((diag.end_column || lineContent.length) - 1, lineContent.length));

      try {
        const mark = cm.markText(
          { line, ch: startCol },
          { line, ch: endCol },
          {
            className: diag.severity === 'error' ? 'codesense-squiggly-error' : 'codesense-squiggly-warning',
            title: diag.message
          }
        );
        activeCodeMirrorMarks.push(mark);
      } catch (e) {
        // Line might not exist
      }
    }
  }

  function clearCodeMirror5Decorations() {
    for (const mark of activeCodeMirrorMarks) {
      if (mark && typeof mark.clear === 'function') {
        mark.clear();
      }
    }
    activeCodeMirrorMarks = [];
  }

  // Setup change event listeners
  function setupListeners() {
    if (isListening) return;

    const ed = getMonacoEditor();
    if (ed && ed.getModel()) {
      ed.getModel().onDidChangeContent(() => {
        currentVersion++;
        const state = readCode();
        window.postMessage({
          source: 'codesense-main',
          type: 'CODESENSE_CODE_CHANGED',
          payload: {
            code: state.code,
            language: state.language,
            version: currentVersion,
            editorType: state.editorType
          },
          timestamp: Date.now()
        }, '*');
      });
      isListening = true;
      log('Monaco change listener attached');
      return;
    }

    const cm5 = getCodeMirror5();
    if (cm5) {
      cm5.on('change', () => {
        currentVersion++;
        const state = readCode();
        window.postMessage({
          source: 'codesense-main',
          type: 'CODESENSE_CODE_CHANGED',
          payload: {
            code: state.code,
            language: state.language,
            version: currentVersion,
            editorType: state.editorType
          },
          timestamp: Date.now()
        }, '*');
      });
      isListening = true;
      log('CodeMirror 5 change listener attached');
      return;
    }
  }

  // Handle messages from content script
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'codesense-content') return;

    switch (event.data.type) {
      case 'CODESENSE_PING': {
        setupListeners();
        const state = readCode();
        window.postMessage({
          source: 'codesense-main',
          type: 'CODESENSE_PONG',
          payload: {
            hasMonaco: !!getMonacoEditor(),
            hasCodeMirror: !!getCodeMirror5() || !!getCodeMirror6(),
            editorType: state.editorType,
            code: state.code,
            language: state.language,
            version: currentVersion
          },
          timestamp: Date.now()
        }, '*');
        break;
      }

      case 'CODESENSE_APPLY_DECORATIONS': {
        const diags = event.data.payload?.diagnostics || [];
        if (getMonacoEditor()) {
          applyMonacoDecorations(diags);
        } else if (getCodeMirror5()) {
          applyCodeMirror5Decorations(diags);
        }
        break;
      }

      case 'CODESENSE_CLEAR_DECORATIONS': {
        clearMonacoDecorations();
        clearCodeMirror5Decorations();
        break;
      }
    }
  });

  // Init
  injectDecorationStyles();
  setupListeners();

  // Polling check to attach as soon as SPA (e.g. LeetCode Next.js) loads Monaco
  let attempts = 0;
  const pollInterval = setInterval(() => {
    attempts++;
    if (!isListening) {
      setupListeners();
    }
    if (isListening || attempts > 20) {
      clearInterval(pollInterval);
    }
  }, 1000);

  log('Bridge script initialized');
})();
