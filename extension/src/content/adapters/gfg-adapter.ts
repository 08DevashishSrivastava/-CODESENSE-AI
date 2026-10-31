import { BaseAdapter } from './base-adapter';
import { Diagnostic, ProblemContext } from '../../types/diagnostics';

export class GFGAdapter extends BaseAdapter {
  readonly name = 'GeeksforGeeks';
  private messageListener: ((e: MessageEvent) => void) | null = null;
  private domObserver: MutationObserver | null = null;

  matchesUrl(url: string): boolean {
    return url.includes('geeksforgeeks.org/problems/') || url.includes('practice.geeksforgeeks.org');
  }

  async initialize(): Promise<boolean> {
    this.injectBridge();
    this.setupBridgeCommunication();
    this.setupFallbackObserver();
    return true;
  }

  private injectBridge() {
    if (document.getElementById('codesense-bridge-script')) return;
    try {
      const script = document.createElement('script');
      script.id = 'codesense-bridge-script';
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        script.src = chrome.runtime.getURL('bridge.js');
      } else {
        script.src = '/bridge.js';
      }
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.warn('[CodeSense AI] Failed injecting bridge on GFG:', e);
    }
  }

  private setupBridgeCommunication() {
    this.messageListener = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'codesense-main') return;
      if (event.data.type === 'CODESENSE_CODE_CHANGED' || event.data.type === 'CODESENSE_PONG') {
        const payload = event.data.payload;
        if (payload?.code) {
          this.notifyChange(payload.code, this.getLanguage());
        }
      }
    };
    window.addEventListener('message', this.messageListener);
  }

  private setupFallbackObserver() {
    this.domObserver = new MutationObserver(() => {
      const code = this.getCode();
      if (code && code !== this.currentCode) {
        this.notifyChange(code, this.getLanguage());
      }
    });

    const root = document.querySelector('.monaco-editor') || document.querySelector('.ace_editor') || document.body;
    this.domObserver.observe(root, { childList: true, subtree: true, characterData: true });
  }

  getCode(): string {
    const viewLines = document.querySelector('.view-lines');
    if (viewLines) {
      const lines = Array.from(viewLines.querySelectorAll('.view-line'));
      return lines.map(l => (l as HTMLElement).innerText).join('\n');
    }
    const aceLines = document.querySelector('.ace_layer.ace_text-layer');
    if (aceLines) {
      const lines = Array.from(aceLines.querySelectorAll('.ace_line'));
      return lines.map(l => (l as HTMLElement).innerText).join('\n');
    }
    return this.currentCode;
  }

  getLanguage(): string {
    const langSelector = document.querySelector('.gfg-lang-select') || 
                          document.querySelector('div[class*="language"]') ||
                          document.querySelector('button[aria-haspopup="listbox"]');
    const text = langSelector?.textContent?.toLowerCase() || '';
    if (text.includes('java')) return 'java';
    if (text.includes('python')) return 'python';
    if (text.includes('c++') || text.includes('cpp')) return 'cpp';
    if (text.includes('javascript') || text.includes('js')) return 'javascript';
    if (text.includes('c')) return 'c';
    return 'java';
  }

  getProblemContext(): ProblemContext {
    const titleEl = document.querySelector('.problems_header_content__X3a_t h3') ||
                    document.querySelector('.problem-heading') ||
                    document.querySelector('h1');
    const descEl = document.querySelector('.problem-statement') || document.querySelector('.problems_problem_content__8dJ0j');

    return {
      title: titleEl?.textContent?.trim() || 'GeeksforGeeks Problem',
      description: descEl?.textContent?.slice(0, 3000) || 'Solve the problem accurately.',
      constraints: 'See problem statement.'
    };
  }

  applyDiagnostics(diagnostics: Diagnostic[]): void {
    window.postMessage({
      source: 'codesense-content',
      type: 'CODESENSE_APPLY_DECORATIONS',
      payload: { diagnostics },
      timestamp: Date.now()
    }, '*');
  }

  clearDiagnostics(): void {
    window.postMessage({
      source: 'codesense-content',
      type: 'CODESENSE_CLEAR_DECORATIONS',
      timestamp: Date.now()
    }, '*');
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
  }
}

