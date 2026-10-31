import { BaseAdapter } from './base-adapter';
import { Diagnostic, ProblemContext } from '../../types/diagnostics';

export class HackerRankAdapter extends BaseAdapter {
  readonly name = 'HackerRank';
  private messageListener: ((e: MessageEvent) => void) | null = null;
  private domObserver: MutationObserver | null = null;

  matchesUrl(url: string): boolean {
    return url.includes('hackerrank.com/challenges/');
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
      console.warn('[CodeSense AI] Failed injecting bridge on HackerRank:', e);
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

    const root = document.querySelector('.monaco-editor') || document.querySelector('.CodeMirror') || document.body;
    this.domObserver.observe(root, { childList: true, subtree: true, characterData: true });
  }

  getCode(): string {
    const viewLines = document.querySelector('.view-lines');
    if (viewLines) {
      const lines = Array.from(viewLines.querySelectorAll('.view-line'));
      return lines.map(l => (l as HTMLElement).innerText).join('\n');
    }
    const cmLines = document.querySelector('.CodeMirror-code');
    if (cmLines) {
      const lines = Array.from(cmLines.querySelectorAll('.CodeMirror-line'));
      return lines.map(l => (l as HTMLElement).innerText).join('\n');
    }
    return this.currentCode;
  }

  getLanguage(): string {
    const langSelect = document.querySelector('.select-language') || document.querySelector('select[name="language"]');
    const text = (langSelect as HTMLSelectElement)?.value || langSelect?.textContent?.toLowerCase() || '';
    if (text.includes('java')) return 'java';
    if (text.includes('py')) return 'python';
    if (text.includes('cpp') || text.includes('c++')) return 'cpp';
    if (text.includes('js') || text.includes('javascript')) return 'javascript';
    if (text.includes('c')) return 'c';
    return 'python';
  }

  getProblemContext(): ProblemContext {
    const titleEl = document.querySelector('.challenge-title') || document.querySelector('h1');
    const descEl = document.querySelector('.challenge-body-html');

    return {
      title: titleEl?.textContent?.trim() || 'HackerRank Challenge',
      description: descEl?.textContent?.slice(0, 3000) || 'Solve the challenge correctly.',
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
