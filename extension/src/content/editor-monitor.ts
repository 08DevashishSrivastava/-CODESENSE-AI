import { IPlatformAdapter } from './adapters/base-adapter';
import { LocalSyntaxAnalyzer } from './local-analyzer';
import { VoiceAlertEngine } from './voice-engine';
import { BackendApiClient } from '../utils/api-client';
import { SettingsStorage } from '../utils/storage';
import { debounce } from '../utils/debounce';
import { Diagnostic, AnalysisPayload } from '../types/diagnostics';
import { UserSettings } from '../types/settings';

export class EditorMonitor {
  private adapter: IPlatformAdapter;
  private settings: UserSettings | null = null;
  private latestVersion: number = 0;
  private isAnalyzing: boolean = false;
  private debouncedAnalyze: { (...args: any[]): void; cancel: () => void };
  private unsubscribeSettings: (() => void) | null = null;
  private unsubscribeEditor: (() => void) | null = null;

  constructor(adapter: IPlatformAdapter) {
    this.adapter = adapter;
    this.debouncedAnalyze = debounce((code: string, language: string, version: number) => {
      this.performAnalysis(code, language, version);
    }, 600); // 600ms debounce
  }

  async start(): Promise<void> {
    this.settings = await SettingsStorage.getSettings();
    this.unsubscribeSettings = SettingsStorage.subscribe((newSettings) => {
      this.settings = newSettings;
      if (!newSettings.enabled) {
        this.clear();
      }
    });

    const initialized = await this.adapter.initialize();
    if (!initialized) {
      console.warn(`[CodeSense AI] Adapter for ${this.adapter.name} failed initialization.`);
      return;
    }

    this.unsubscribeEditor = this.adapter.subscribeToChanges((state) => {
      if (!this.settings?.enabled) return;

      this.latestVersion = state.version;
      // Trigger debounced analysis
      this.debouncedAnalyze(state.code, state.language, state.version);
    });

    // Initial check on load
    const initialCode = this.adapter.getCode();
    const initialLang = this.adapter.getLanguage();
    if (initialCode) {
      this.performAnalysis(initialCode, initialLang, ++this.latestVersion);
    }
  }

  private async performAnalysis(code: string, language: string, version: number): Promise<void> {
    if (!this.settings || !this.settings.enabled || !code.trim()) {
      this.adapter.clearDiagnostics();
      return;
    }

    // Step 1: Immediate Local Syntax Analysis (Stage 1 fallback)
    const localDiagnostics = LocalSyntaxAnalyzer.analyze(code, language);

    // If version changed while analyzing, cancel
    if (version !== this.latestVersion) {
      return;
    }

    let mergedDiagnostics: Diagnostic[] = [...localDiagnostics];

    // Step 2: Backend Analysis (Static + AI Logic)
    if (this.settings.analysis_mode !== 'static' || localDiagnostics.length === 0) {
      try {
        const payload: AnalysisPayload = {
          code,
          language,
          code_version: version,
          problem_context: this.adapter.getProblemContext()
        };

        const res = await BackendApiClient.analyze(payload, this.settings, 'analyze');

        // Check if code has changed while waiting for network response
        if (version === this.latestVersion && res.success && res.diagnostics) {
          // Merge unique diagnostics
          const localKeys = new Set(localDiagnostics.map(d => `${d.line}:${d.category}`));
          for (const diag of res.diagnostics) {
            const key = `${diag.line}:${diag.category}`;
            if (!localKeys.has(key)) {
              mergedDiagnostics.push(diag);
            }
          }
        }
      } catch (err) {
        // Backend offline or timeout: graceful fallback to local diagnostics
        console.debug('[CodeSense AI] Backend unreachable, relying on local diagnostics');
      }
    }

    // Double check that user hasn't typed since request completed
    if (version !== this.latestVersion) {
      return;
    }

    // Step 3: Apply subtle red squiggly underlines
    if (mergedDiagnostics.length > 0) {
      this.adapter.applyDiagnostics(mergedDiagnostics);
    } else {
      this.adapter.clearDiagnostics();
    }

    // Step 4: Trigger Voice Alert Engine
    VoiceAlertEngine.getInstance().alert(mergedDiagnostics, this.settings);
  }

  clear(): void {
    this.debouncedAnalyze.cancel();
    this.adapter.clearDiagnostics();
    VoiceAlertEngine.getInstance().cancel();
  }

  stop(): void {
    this.clear();
    if (this.unsubscribeSettings) {
      this.unsubscribeSettings();
      this.unsubscribeSettings = null;
    }
    if (this.unsubscribeEditor) {
      this.unsubscribeEditor();
      this.unsubscribeEditor = null;
    }
    this.adapter.destroy();
  }
}

