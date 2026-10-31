export interface UserSettings {
  enabled: boolean;
  voice_enabled: boolean;
  voice_language: string; // e.g. 'en-IN' or 'hi-IN'
  voice_personality: 'professional' | 'friendly' | 'roast';
  profanity_enabled: boolean;
  voice_name: string; // Selected browser voice name
  speech_rate: number; // 0.5 to 2.0 (default 1.0)
  speech_volume: number; // 0.0 to 1.0 (default 1.0)
  alert_cooldown: number; // in milliseconds (default 3000)
  enabled_languages: string[]; // ['java', 'python', 'cpp', 'javascript', 'c']
  analysis_mode: 'static' | 'ai' | 'hybrid'; // default hybrid
  save_history: boolean;
  backend_url: string; // default http://localhost:8000
  voice_message_override?: string;
  user_token?: string; // Supabase access token
  user_id?: string;
  user_email?: string;
  is_guest: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  voice_enabled: true,
  voice_language: 'en-IN',
  voice_personality: 'professional',
  profanity_enabled: false,
  voice_name: '',
  speech_rate: 1.0,
  speech_volume: 1.0,
  alert_cooldown: 3000,
  enabled_languages: ['java', 'python', 'cpp', 'javascript', 'c'],
  analysis_mode: 'hybrid',
  save_history: false,
  backend_url: 'http://localhost:8000',
  voice_message_override: '',
  is_guest: true
};
