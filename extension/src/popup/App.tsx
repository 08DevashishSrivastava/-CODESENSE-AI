import React, { useEffect, useState } from 'react';
import { 
  Power, 
  Volume2, 
  VolumeX, 
  Flame,
  Smile,
  Briefcase,
  Play,
  Settings as SettingsIcon,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { SettingsStorage } from '../utils/storage';
import { BackendApiClient } from '../utils/api-client';
import { DEFAULT_SETTINGS, UserSettings, VoicePersonality } from '../types/settings';

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    SettingsStorage.getSettings().then((s) => {
      setSettings(s);
      checkBackend(s.backend_url);
    });
  }, []);

  const checkBackend = async (url: string) => {
    setBackendStatus('checking');
    const ok = await BackendApiClient.checkHealth(url);
    setBackendStatus(ok ? 'connected' : 'offline');
  };

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = await SettingsStorage.saveSettings({ [key]: value });
    setSettings(updated);
  };

  const testVoice = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    let testText = "Warning! Incorrect loop condition detected on line 8.";
    if (settings.voice_personality === 'friendly') {
      testText = "Bhai, yahan loop condition check kar lo. Kuch galat lag raha hai.";
    } else if (settings.voice_personality === 'roast') {
      if (settings.profanity_enabled) {
        testText = "Abe laude, ye line galat likh di! Loop condition check kar!";
      } else {
        testText = "Abe, i <= n kyu likha? i < n hona chahiye! Loop condition check kar!";
      }
    }
    
    const utter = new SpeechSynthesisUtterance(testText);
    utter.rate = settings.speech_rate || 1.0;
    utter.volume = settings.speech_volume || 1.0;

    const voices = window.speechSynthesis.getVoices();
    // Prefer Indian/Hindi accent for friendly or roast
    let matchVoice = voices.find(v => v.name === settings.voice_name);
    if (!matchVoice && (settings.voice_personality === 'friendly' || settings.voice_personality === 'roast')) {
      matchVoice = voices.find(v => 
        v.lang.toLowerCase().includes('hi') || 
        v.lang.toLowerCase().includes('in') ||
        v.name.toLowerCase().includes('india')
      );
    }
    if (!matchVoice && settings.voice_language) {
      matchVoice = voices.find(v => v.lang.toLowerCase().startsWith(settings.voice_language.split('-')[0].toLowerCase()));
    }
    if (matchVoice) utter.voice = matchVoice;

    setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const openOptionsPage = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../options/index.html', '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 text-sm">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            CS
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-sm leading-tight">CodeSense AI</h1>
            <p className="text-[10px] text-slate-500">Real-time error detection</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-1.5 bg-slate-100 px-2 py-1 rounded-full text-[11px]">
          {backendStatus === 'connected' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-700 font-medium">Backend Ready</span>
            </>
          )}
          {backendStatus === 'offline' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="text-amber-700 font-medium">Local Mode</span>
            </>
          )}
          {backendStatus === 'checking' && (
            <span className="text-slate-500">Checking...</span>
          )}
        </div>
      </header>

      {/* Main Controls */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
        {/* Enable / Disable Card */}
        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2.5">
            <Power className={`w-4 h-4 ${settings.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <p className="text-xs font-semibold text-slate-900">Extension Active</p>
              <p className="text-[11px] text-slate-500">Monitors code changes in editor</p>
            </div>
          </div>
          <button
            onClick={() => updateSetting('enabled', !settings.enabled)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.enabled ? 'bg-slate-900' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Voice Personality Selector (NEW FEATURE) */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {settings.voice_personality === 'roast' && <Flame className="w-4 h-4 text-rose-500" />}
              {settings.voice_personality === 'friendly' && <Smile className="w-4 h-4 text-emerald-500" />}
              {settings.voice_personality === 'professional' && <Briefcase className="w-4 h-4 text-blue-500" />}
              <p className="text-xs font-semibold text-slate-900">Voice Personality</p>
            </div>
            {settings.voice_personality === 'roast' && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wide">
                Desi Roast
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'professional', label: 'Professional', icon: Briefcase },
              { id: 'friendly', label: 'Friendly', icon: Smile },
              { id: 'roast', label: 'Desi Roast', icon: Flame }
            ].map((p) => {
              const active = settings.voice_personality === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => updateSetting('voice_personality', p.id as VoicePersonality)}
                  className={`py-1.5 px-2 text-xs rounded-md border flex flex-col items-center justify-center space-y-1 transition ${
                    active 
                      ? p.id === 'roast'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold shadow-sm'
                        : 'border-slate-900 bg-slate-900 text-white font-medium shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p.icon className={`w-3.5 h-3.5 ${active && p.id === 'roast' ? 'text-rose-600' : ''}`} />
                  <span className="text-[11px]">{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Profanity Toggle for Desi Roast Mode */}
          {settings.voice_personality === 'roast' && (
            <div className="pt-2 border-t border-rose-100 flex items-center justify-between bg-rose-50/50 p-2 rounded-md">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <div>
                  <p className="text-[11px] font-semibold text-rose-900">Explicit Profanity</p>
                  <p className="text-[10px] text-rose-600">Enables unfiltered roast words</p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('profanity_enabled', !settings.profanity_enabled)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  settings.profanity_enabled ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.profanity_enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Voice Alert Settings Card */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {settings.voice_enabled ? (
                <Volume2 className="w-4 h-4 text-blue-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-900">Voice Alerts</p>
                <p className="text-[11px] text-slate-500">Speaks short explanations of errors</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('voice_enabled', !settings.voice_enabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.voice_enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.voice_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.voice_enabled && (
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              {/* Language selection */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600">Voice Language</span>
                <select
                  value={settings.voice_language}
                  onChange={(e) => updateSetting('voice_language', e.target.value)}
                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-800 focus:outline-none focus:border-slate-400"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-IN">Indian English (en-IN)</option>
                  <option value="hi-IN">Hindi (हिन्दी)</option>
                </select>
              </div>

              {/* Speed slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Speed</span>
                  <span className="font-mono text-slate-700">{settings.speech_rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={settings.speech_rate}
                  onChange={(e) => updateSetting('speech_rate', parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
              </div>

              {/* Test Button */}
              <button
                onClick={testVoice}
                disabled={isSpeaking}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded transition"
              >
                <Play className="w-3 h-3 text-slate-700" />
                <span>{isSpeaking ? 'Speaking...' : `Test ${settings.voice_personality === 'roast' ? 'Roast' : settings.voice_personality === 'friendly' ? 'Friendly' : 'Professional'} Alert`}</span>
              </button>
            </div>
          )}
        </div>

        {/* Analysis Mode */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-semibold text-slate-900">Analysis Mode</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {(['hybrid', 'static', 'ai'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => updateSetting('analysis_mode', mode)}
                className={`py-1 text-xs rounded border capitalize transition ${
                  settings.analysis_mode === mode
                    ? 'border-slate-900 bg-slate-900 text-white font-medium'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400">v1.1.0</span>
        <button
          onClick={openOptionsPage}
          className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 text-xs font-medium"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Full Settings</span>
        </button>
      </footer>
    </div>
  );
}
