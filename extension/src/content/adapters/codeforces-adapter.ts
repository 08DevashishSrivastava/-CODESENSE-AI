import { BaseAdapter } from './base-adapter';
import { Diagnostic, ProblemContext } from '../../types/diagnostics';

export class CodeforcesAdapter extends BaseAdapter {
  readonly name = 'Codeforces';
  private domObserver: MutationObserver | null = null;
  private inputListener: ((e: Event) => void) | null = null;

  matchesUrl(url: string): boolean {
    return url.includes('codeforces.com/problemset/problem/') || url.includes('codeforces.com/contest/');
  }

  async initialize(): Promise<boolean> {
    this.setupTextareaListener();
    return true;
  }

  private setupTextareaListener() {
    const textarea = document.querySelector('textarea#source') as HTMLTextAreaElement ||
                     document.querySelector('textarea[name="source"]') as HTMLTextAreaElement;
    if (textarea) {
      this.inputListener = () => {
        this.notifyChange(textarea.value, this.getLanguage());
      };
      textarea.addEventListener('input', this.inputListener);
    }
  }

  getCode(): string {
    const textarea = document.querySelector('textarea#source') as HTMLTextAreaElement ||
                     document.querySelector('textarea[name="source"]') as HTMLTextAreaElement;
    return textarea ? textarea.value : this.currentCode;
  }

  getLanguage(): string {
    const select = document.querySelector('select[name="programTypeId"]') as HTMLSelectElement;
    if (select) {
      const selectedOption = select.options[select.selectedIndex]?.text?.toLowerCase() || '';
      if (selectedOption.includes('java')) return 'java';
      if (selectedOption.includes('py')) return 'python';
      if (selectedOption.includes('c++') || selectedOption.includes('gnu g++')) return 'cpp';
      if (selectedOption.includes('javascript') || selectedOption.includes('node')) return 'javascript';
      if (selectedOption.includes('c')) return 'c';
    }
    return 'cpp';
  }

  getProblemContext(): ProblemContext {
    const titleEl = document.querySelector('.problem-statement .title');
    const descEl = document.querySelector('.problem-statement');

    return {
      title: titleEl?.textContent?.trim() || 'Codeforces Problem',
      description: descEl?.textContent?.slice(0, 3000) || 'Solve the competitive programming problem.',
      constraints: 'See problem statement.'
    };
  }

  applyDiagnostics(diagnostics: Diagnostic[]): void {
    // For Codeforces textarea, underline isn't directly native in standard textarea without an overlay.
    // We add a subtle floating badge near the textarea reporting the exact line and error.
    this.clearDiagnostics();
    const textarea = document.querySelector('textarea#source') || document.querySelector('textarea[name="source"]');
    if (!textarea || diagnostics.length === 0) return;

    const first = diagnostics[0];
    const badge = document.createElement('div');
    badge.id = 'codesense-cf-badge';
    badge.style.position = 'relative';
    badge.style.marginTop = '4px';
    badge.style.padding = '6px 12px';
    badge.style.background = '#FEE2E2';
    badge.style.border = '1px solid #EF4444';
    badge.style.borderRadius = '4px';
    badge.style.color = '#B91C1C';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '500';
    badge.textContent = `Line ${first.line}: ${first.message}`;
    textarea.parentNode?.insertBefore(badge, textarea.nextSibling);
  }

  clearDiagnostics(): void {
    const badge = document.getElementById('codesense-cf-badge');
    badge?.remove();
  }

  destroy(): void {
    super.destroy();
    if (this.inputListener) {
      const textarea = document.querySelector('textarea#source') || document.querySelector('textarea[name="source"]');
      textarea?.removeEventListener('input', this.inputListener);
      this.inputListener = null;
    }
    this.clearDiagnostics();
  }
}

