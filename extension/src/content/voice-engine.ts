import { Diagnostic } from '../types/diagnostics';
import { UserSettings } from '../types/settings';

export class VoiceAlertEngine {
  private static instance: VoiceAlertEngine | null = null;
  private synth: SpeechSynthesis | null = null;
  private spokenFingerprints: Map<string, number> = new Map(); // id -> timestamp
  private lastAlertTimestamp: number = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  static getInstance(): VoiceAlertEngine {
    if (!this.instance) {
      this.instance = new VoiceAlertEngine();
    }
    return this.instance;
  }

  private loadVoices() {
    if (!this.synth) return;
    this.availableVoices = this.synth.getVoices();
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && this.synth) {
      this.loadVoices();
    }
    return this.availableVoices;
  }

  /**
   * Evaluates diagnostics and speaks the highest priority un-alerted error,
   * respecting cooldown, confidence threshold, and deduplication.
   */
  alert(diagnostics: Diagnostic[], settings: UserSettings): void {
    if (!settings.enabled || !settings.voice_enabled || !this.synth) {
      return;
    }

    const now = Date.now();
    const cooldown = settings.alert_cooldown || 3000;

    // Filter to actionable, high/medium confidence errors
    const actionable = diagnostics
      .filter(d => (d.confidence >= 0.75) && (d.severity === 'error' || d.severity === 'warning'))
      .sort((a, b) => b.confidence - a.confidence);

    if (actionable.length === 0) {
      return;
    }

    // Clean up spoken fingerprints for errors that no longer exist
    const activeIds = new Set(diagnostics.map(d => d.id));
    for (const [id] of this.spokenFingerprints) {
      if (!activeIds.has(id)) {
        this.spokenFingerprints.delete(id);
      }
    }

    // Find the first error that has not been spoken yet
    const targetError = actionable.find(d => !this.spokenFingerprints.has(d.id));
    if (!targetError) {
      return; // All current errors have already been alerted
    }

    // Check cooldown since last speech
    if (now - this.lastAlertTimestamp < cooldown) {
      return; // In cooldown period to prevent rapid speech overlap
    }

    // Generate speech text
    const textToSpeak = targetError.voice_text || 
      `${targetError.severity === 'error' ? 'Error' : 'Warning'} on line ${targetError.line}. ${targetError.message}`;

    this.speak(textToSpeak, targetError.id, settings);
  }

  private speak(text: string, fingerprint: string, settings: UserSettings) {
    if (!this.synth) return;

    // Cancel any previous in-flight utterance
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.5, Math.min(settings.speech_rate || 1.0, 2.0));
    utterance.volume = Math.max(0.0, Math.min(settings.speech_volume || 1.0, 1.0));

    // Choose voice matching user settings
    const voices = this.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (settings.voice_name) {
      selectedVoice = voices.find(v => v.name === settings.voice_name);
    }

    if (!selectedVoice && settings.voice_language) {
      const langPrefix = settings.voice_language.split('-')[0].toLowerCase();
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      this.activeUtterance = null;
    };

    utterance.onerror = (e) => {
      console.warn('[CodeSense AI] Voice synthesis error:', e);
      this.activeUtterance = null;
    };

    this.activeUtterance = utterance;
    this.lastAlertTimestamp = Date.now();
    this.spokenFingerprints.set(fingerprint, this.lastAlertTimestamp);

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[CodeSense AI] Failed to trigger speech synthesis:', err);
    }
  }

  cancel(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (err) {
        // ignore
      }
      this.activeUtterance = null;
    }
  }

  resetSpokenCache(): void {
    this.spokenFingerprints.clear();
    this.lastAlertTimestamp = 0;
  }
}
