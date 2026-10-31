import { Diagnostic } from '../types/diagnostics';
import { UserSettings, VoicePersonality } from '../types/settings';

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
   * Generates a spoken message based on personality, profanity setting, and error category.
   */
  static formatMessage(diag: Diagnostic, settings: UserSettings): string {
    const personality = settings.voice_personality || 'professional';
    const profanity = !!settings.profanity_enabled;
    const cat = diag.category || 'syntax';
    const line = diag.line;

    // Check for user-defined custom override template
    if (settings.custom_voice_templates && settings.custom_voice_templates[cat]) {
      return settings.custom_voice_templates[cat]
        .replace('{line}', String(line))
        .replace('{message}', diag.message);
    }

    if (personality === 'friendly') {
      switch (cat) {
        case 'boundary':
          return `Bhai, yahan loop condition check kar lo line ${line} pe. Array boundary se bahar nikal jaoge.`;
        case 'syntax':
          if (diag.message.toLowerCase().includes('bracket')) {
            return `Bhai, bracket band karna bhool gaya line ${line} pe!`;
          }
          return `Bhai, line ${line} pe semicolon ya syntax miss ho gaya.`;
        case 'logic':
          if (diag.message.toLowerCase().includes('return')) {
            return `Bhai kya kar raha hai? Ye return statement galat hai line ${line} pe!`;
          }
          return `Bhai, line ${line} pe logic check kar lo. Kuch galat lag raha hai.`;
        case 'infinite_loop':
          return `Bhai dhyan do, infinite loop ban sakta hai line ${line} pe.`;
        case 'type':
          return `Kya code likh raha hai bhai? Ye variable declare hi nahi kiya line ${line} pe!`;
        default:
          return `Bhai, line ${line} pe dhyan se check kar lo.`;
      }
    }

    if (personality === 'roast') {
      if (profanity) {
        // Desi Roast Mode with Profanity Enabled
        switch (cat) {
          case 'boundary':
            return `Oye laude, array ki length se bahar mat ja! Line ${line} check kar!`;
          case 'syntax':
            if (diag.message.toLowerCase().includes('bracket')) {
              return `Abe laude, bracket band karna bhool gaya kya line ${line} pe?`;
            }
            return `Abe laude, ye line ${line} galat likh di! Semicolon bhool gaya kya?`;
          case 'logic':
            if (diag.message.toLowerCase().includes('return')) {
              return `Abe laude, kya code likh raha hai? Ye return statement galat hai!`;
            }
            return `Abe laude, ye line ${line} galat likh di! Loop condition check kar!`;
          case 'infinite_loop':
            return `Oye laude, infinite loop bana diya kya browser crash karne ke liye? Line ${line} dekh!`;
          case 'type':
            return `Abe laude, variable declare kiya nahi aur use karne lag gaya line ${line} pe?`;
          default:
            return `Abe laude, line ${line} pe itna ganda error kar diya! Check kar!`;
        }
      } else {
        // Desi Roast Mode (Clean / Sanskari Roast)
        switch (cat) {
          case 'boundary':
            return `Abe, i <= n kyu likha? i < n hona chahiye! Line ${line} dekh!`;
          case 'syntax':
            if (diag.message.toLowerCase().includes('bracket')) {
              return `Abe akal ke andhe, bracket band karna bhool gaya line ${line} pe!`;
            }
            return `Abe coder, line ${line} pe syntax hi galat likh diya! Semicolon kon lagayega?`;
          case 'logic':
            if (diag.message.toLowerCase().includes('return')) {
              return `Bhai kya kar raha hai? Ye return statement galat hai line ${line} pe!`;
            }
            return `Abe bhai, ye line ${line} galat likh di! Loop condition check kar!`;
          case 'infinite_loop':
            return `Oye coder, infinite loop bana diya kya browser crash karne ke liye?`;
          case 'type':
            return `Kya code likh raha hai bhai? Ye variable declare hi nahi kiya line ${line} pe!`;
          default:
            return `Kya coding chal rahi hai bhai? Line ${line} pe seedha error hai!`;
        }
      }
    }

    // Default: Professional Mode
    if (diag.voice_text) return diag.voice_text;
    switch (cat) {
      case 'boundary':
        return `Warning! Incorrect loop condition detected on line ${line}.`;
      case 'syntax':
        return `Syntax error detected on line ${line}. Check brackets or semicolons.`;
      case 'logic':
        return `Warning! Suspicious logic or return statement on line ${line}.`;
      case 'infinite_loop':
        return `Possible infinite loop condition detected on line ${line}.`;
      case 'type':
        return `Warning! Undefined variable referenced on line ${line}.`;
      default:
        return `Error detected on line ${line}. ${diag.message}`;
    }
  }

  /**
   * Evaluates diagnostics and speaks the highest priority un-alerted error.
   */
  alert(diagnostics: Diagnostic[], settings: UserSettings): void {
    if (!settings.enabled || !settings.voice_enabled || !this.synth) {
      return;
    }

    // Clean up spoken fingerprints for errors that no longer exist
    const activeIds = new Set(diagnostics.map(d => d.id));
    for (const [id] of this.spokenFingerprints) {
      if (!activeIds.has(id)) {
        this.spokenFingerprints.delete(id);
      }
    }

    // Filter to actionable, high/medium confidence errors
    const actionable = diagnostics
      .filter(d => (d.confidence >= 0.75) && (d.severity === 'error' || d.severity === 'warning'))
      .sort((a, b) => b.confidence - a.confidence);

    if (actionable.length === 0) {
      return;
    }

    // Find first error not yet alerted
    const targetError = actionable.find(d => !this.spokenFingerprints.has(d.id));
    if (!targetError) {
      return; // All active errors already alerted
    }

    // Check cooldown
    const now = Date.now();
    const cooldown = settings.alert_cooldown || 3000;
    if (now - this.lastAlertTimestamp < cooldown) {
      return;
    }

    // Generate formatted message matching voice personality
    const textToSpeak = VoiceAlertEngine.formatMessage(targetError, settings);
    this.speak(textToSpeak, targetError.id, settings);
  }

  private speak(text: string, fingerprint: string, settings: UserSettings) {
    if (!this.synth) return;

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.5, Math.min(settings.speech_rate || 1.0, 2.0));
    utterance.volume = Math.max(0.0, Math.min(settings.speech_volume || 1.0, 1.0));

    const voices = this.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (settings.voice_name) {
      selectedVoice = voices.find(v => v.name === settings.voice_name);
    }

    // When friendly or roast is enabled, prefer an Indian accent or Hindi voice for natural tone
    const isDesi = settings.voice_personality === 'friendly' || settings.voice_personality === 'roast';
    if (!selectedVoice && isDesi) {
      selectedVoice = voices.find(v => 
        v.lang.toLowerCase().includes('hi') || 
        v.lang.toLowerCase().includes('in') ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('hindi')
      );
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
