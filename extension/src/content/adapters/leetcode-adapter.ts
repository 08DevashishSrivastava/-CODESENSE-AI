import { BaseAdapter, EditorState } from './base-adapter';
import { Diagnostic, ProblemContext } from '../../types/diagnostics';

export class LeetCodeAdapter extends BaseAdapter {
  readonly name = 'LeetCode';
  private bridgeInjected: boolean = false;
  private messageListener: ((e: MessageEvent) => void) | null = null;
  private domObserver: MutationObserver | null = null;
  private currentDecorations: Diagnostic[] = [];

  matchesUrl(url: string): boolean {
    return url.includes('leetcode.com/problems/');
  }

  async initialize(): Promise<boolean> {
    this.injectBridge();
    this.setupBridgeCommunication();
    this.setupFallbackObserver();
    this.pingBridge();
    return true;
  }

  private injectBridge() {
    if (this.bridgeInjected || document.getElementById('codesense-bridge-script')) {
      return;
    }

    try {
      const script = document.createElement('script');
      script.id = 'codesense-bridge-script';
      // In chrome extension context
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        script.src = chrome.runtime.getURL('bridge.js');
      } else {
        script.src = '/bridge.js';
      }
      (document.head || document.documentElement).appendChild(script);
      this.bridgeInjected = true;
    } catch (e) {
      console.warn('[CodeSense AI] Failed to inject bridge script, using DOM fallback:', e);
    }
  }

  private setupBridgeCommunication() {
    this.messageListener = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'codesense-main') return;

      if (event.data.type === 'CODESENSE_CODE_CHANGED' || event.data.type === 'CODESENSE_PONG') {
        const payload = event.data.payload;
        if (payload && typeof payload.code === 'string') {
          const lang = this.normalizeLanguage(payload.language || this.getLanguage());
          this.notifyChange(payload.code, lang);
        }
      }
    };
    window.addEventListener('message', this.messageListener);
  }

  private pingBridge() {
    window.postMessage({
      source: 'codesense-content',
      type: 'CODESENSE_PING',
      timestamp: Date.now()
    }, '*');
  }

  private setupFallbackObserver() {
    // Also monitor standard LeetCode editor DOM for changes or fallback extraction
    this.domObserver = new MutationObserver(() => {
      const domCode = this.getCodeFromDOM();
      if (domCode && domCode !== this.currentCode) {
        this.notifyChange(domCode, this.getLanguage());
      }
    });

    const editorContainer = document.querySelector('.monaco-editor') || document.querySelector('#editor') || document.body;
    this.domObserver.observe(editorContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private getCodeFromDOM(): string {
    // If Monaco is present in DOM, lines are within .view-lines
    const viewLines = document.querySelector('.view-lines');
    if (viewLines) {
      const lines = Array.from(viewLines.querySelectorAll('.view-line'));
      if (lines.length > 0) {
        return lines.map(l => (l as HTMLElement).innerText).join('\n');
      }
    }

    // CodeMirror fallback
    const cmLines = document.querySelector('.CodeMirror-code');
    if (cmLines) {
      const lines = Array.from(cmLines.querySelectorAll('.CodeMirror-line'));
      if (lines.length > 0) {
        return lines.map(l => (l as HTMLElement).innerText).join('\n');
      }
    }

    return '';
  }

  getCode(): string {
    return this.currentCode || this.getCodeFromDOM();
  }

  getLanguage(): string {
    // Try to find LeetCode language selector button
    const langBtn = document.querySelector('button[id*="headlessui-listbox-button"]') ||
                    document.querySelector('[data-cy="lang-select"]') ||
                    document.querySelector('.ant-select-selection-item');
    
    const text = langBtn?.textContent?.toLowerCase().trim() || '';
    return this.normalizeLanguage(text);
  }

  private normalizeLanguage(raw: string): string {
    const l = raw.toLowerCase();
    if (l.includes('python') || l === 'py') return 'python';
    if (l.includes('java') && !l.includes('javascript')) return 'java';
    if (l.includes('c++') || l.includes('cpp')) return 'cpp';
    if (l.includes('javascript') || l.includes('js') || l.includes('typescript')) return 'javascript';
    if (l === 'c') return 'c';
    return 'python'; // default
  }

  getProblemContext(): ProblemContext {
    let title = '';
    let description = '';
    let constraints = '';

    // LeetCode title
    const titleEl = document.querySelector('[data-cy="question-title"]') || 
                    document.querySelector('.text-title-large') ||
                    document.querySelector('div[class*="title"] a');
    if (titleEl) {
      title = titleEl.textContent?.trim() || '';
    }

    // LeetCode problem description & constraints
    const contentEl = document.querySelector('[data-track-load="description_content"]') ||
                      document.querySelector('div[class*="content__uDisplay"]') ||
                      document.querySelector('.elfjS');

    if (contentEl) {
      const fullText = (contentEl as HTMLElement).innerText || '';
      description = fullText.slice(0, 3000); // Send sufficient context

      // Look for Constraints section
      const match = fullText.match(/Constraints:([\s\S]*?)(?:Example|$)/i);
      if (match && match[1]) {
        constraints = match[1].trim();
      }
    }

    return {
      title: title || 'LeetCode Problem',
      description: description || 'Solve the algorithmic problem correctly.',
      constraints: constraints || 'Standard online judge constraints.'
    };
  }

  applyDiagnostics(diagnostics: Diagnostic[]): void {
    this.currentDecorations = diagnostics;
    // Send to MAIN world bridge to apply Monaco/CodeMirror decorations
    window.postMessage({
      source: 'codesense-content',
      type: 'CODESENSE_APPLY_DECORATIONS',
      payload: { diagnostics },
      timestamp: Date.now()
    }, '*');

    // Also apply DOM underline fallback for robustness
    this.applyDOMUnderlineFallback(diagnostics);
  }

  clearDiagnostics(): void {
    this.currentDecorations = [];
    window.postMessage({
      source: 'codesense-content',
      type: 'CODESENSE_CLEAR_DECORATIONS',
      timestamp: Date.now()
    }, '*');
    this.clearDOMUnderlineFallback();
  }

  private applyDOMUnderlineFallback(diagnostics: Diagnostic[]) {
    this.clearDOMUnderlineFallback();
    const viewLines = document.querySelector('.view-lines');
    if (!viewLines) return;

    const lines = Array.from(viewLines.querySelectorAll('.view-line'));
    for (const diag of diagnostics) {
      const idx = diag.line - 1;
      if (idx >= 0 && idx < lines.length) {
        const lineEl = lines[idx] as HTMLElement;
        lineEl.classList.add('codesense-dom-error');
        lineEl.style.textDecoration = 'underline wavy #EF4444 1.5px';
        lineEl.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
        lineEl.setAttribute('data-codesense-msg', diag.message);
      }
    }
  }

  private clearDOMUnderlineFallback() {
    const errorLines = document.querySelectorAll('.codesense-dom-error');
    errorLines.forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.classList.remove('codesense-dom-error');
      htmlEl.style.textDecoration = '';
      htmlEl.style.backgroundColor = '';
      htmlEl.removeAttribute('data-codesense-msg');
    });
  }

  destroy(): void {
    super.destroy();
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    this.clearDiagnostics();
  }
}
