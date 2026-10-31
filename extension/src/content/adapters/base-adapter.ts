import { Diagnostic, ProblemContext } from '../../types/diagnostics';

export interface EditorState {
  code: string;
  language: string;
  version: number;
}

export interface IPlatformAdapter {
  readonly name: string;
  matchesUrl(url: string): boolean;
  initialize(): Promise<boolean>;
  getCode(): string;
  getLanguage(): string;
  getProblemContext(): ProblemContext;
  subscribeToChanges(callback: (state: EditorState) => void): () => void;
  applyDiagnostics(diagnostics: Diagnostic[]): void;
  clearDiagnostics(): void;
  destroy(): void;
}

export abstract class BaseAdapter implements IPlatformAdapter {
  abstract readonly name: string;
  protected currentCode: string = '';
  protected currentLanguage: string = 'python';
  protected version: number = 0;
  protected changeSubscribers: Array<(state: EditorState) => void> = [];

  abstract matchesUrl(url: string): boolean;
  abstract initialize(): Promise<boolean>;
  abstract getCode(): string;
  abstract getLanguage(): string;
  abstract getProblemContext(): ProblemContext;
  abstract applyDiagnostics(diagnostics: Diagnostic[]): void;
  abstract clearDiagnostics(): void;

  subscribeToChanges(callback: (state: EditorState) => void): () => void {
    this.changeSubscribers.push(callback);
    return () => {
      this.changeSubscribers = this.changeSubscribers.filter(sub => sub !== callback);
    };
  }

  protected notifyChange(code: string, language: string) {
    if (code === this.currentCode && language === this.currentLanguage) {
      return;
    }
    this.currentCode = code;
    this.currentLanguage = language;
    this.version++;
    
    const state: EditorState = {
      code,
      language,
      version: this.version
    };

    for (const sub of this.changeSubscribers) {
      try {
        sub(state);
      } catch (err) {
        console.error(`[CodeSense AI] Error in change subscriber on ${this.name}:`, err);
      }
    }
  }

  destroy(): void {
    this.changeSubscribers = [];
  }
}
