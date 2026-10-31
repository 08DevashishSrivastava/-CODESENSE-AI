import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Volume2, 
  Server, 
  Code, 
  User, 
  Save, 
  CheckCircle, 
  RefreshCw,
  LogOut,
  LogIn,
  Flame,
  Smile,
  Briefcase,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { SettingsStorage } from '../utils/storage';
import { BackendApiClient } from '../utils/api-client';
import { DEFAULT_SETTINGS, UserSettings, VoicePersonality } from '../types/settings';

export default function Options() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [customTemplateKey, setCustomTemplateKey] = useState('boundary');
  const [customTemplateVal, setCustomTemplateVal] = useState('');

  useEffect(() => {
    SettingsStorage.getSettings().then((s) => {
      setSettings(s);
      checkBackend(s.backend_url);
    });
  }, []);

  const checkBackend = async (url: string) => {
    const ok = await BackendApiClient.checkHealth(url);
    setBackendHealth(ok);
  };

  const handleSave = async () => {
    await SettingsStorage.saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const toggleLanguage = (lang: string) => {
    const list = settings.enabled_languages || [];
    const updated = list.includes(lang) ? list.filter(l => l !== lang) : [...list, lang];
    setSettings({ ...settings, enabled_languages: updated });
  };

  const handleSetCustomTemplate = () => {
    if (!customTemplateVal.trim()) return;
    const current = { ...(settings.custom_voice_templates || {}) };
    current[customTemplateKey] = customTemplateVal.trim();
    setSettings({ ...settings, custom_voice_templates: current });
    setCustomTemplateVal('');
  };

  const handleRemoveCustomTemplate = (key: string) => {
    const current = { ...(settings.custom_voice_templates || {}) };
    delete current[key];
    setSettings({ ...settings, custom_voice_templates: current });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage('Authenticating with backend...');
    try {
      const res = await fetch(`${settings.backend_url}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        const updated = await SettingsStorage.saveSettings({
          user_token: data.access_token,
          user_email: authEmail,
          is_guest: false
        });
        setSettings(updated);
        setAuthMessage('Signed in successfully!');
      } else {
        setAuthMessage(data.detail || 'Authentication failed. Check credentials.');
      }
    } catch (err: any) {
      setAuthMessage('Could not reach backend auth service.');
    }
  };

  const handleLogout = async () => {
    const updated = await SettingsStorage.saveSettings({
      user_token: undefined,
      user_email: undefined,
      is_guest: true
    });
    setSettings(updated);
    setAuthMessage('Signed out. Running in Guest mode.');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow">
            CS
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">CodeSense AI Settings</h1>
            <p className="text-xs text-slate-500">Configure real-time error detection, voice personalities, and privacy</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition"
        >
          {isSaved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Preferences Saved' : 'Save Preferences'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        {/* Left Column: Account & Connection */}
        <div className="space-y-6 md:col-span-1">
          {/* Backend Connection */}
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
              <Server className="w-4 h-4 text-blue-600" />
              <span>Backend Connection</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">FastAPI Backend URL</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={settings.backend_url}
                  onChange={(e) => setSettings({ ...settings, backend_url: e.target.value })}
                  className="flex-1 text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  onClick={() => checkBackend(settings.backend_url)}
                  className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                  title="Check health"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${backendHealth ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-slate-600 font-medium">
                {backendHealth === true && 'Backend Online'}
                {backendHealth === false && 'Backend Offline (Using Local Fallback)'}
                {backendHealth === null && 'Checking health...'}
              </span>
            </div>
          </div>

          {/* Account & Guest Mode */}
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Account Status</span>
            </div>

            {settings.user_token ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                  <p className="font-semibold">Connected to Supabase</p>
                  <p className="text-[11px] truncate mt-0.5">{settings.user_email || 'Authenticated User'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out to Guest Mode</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-2.5">
                <p className="text-[11px] text-slate-500">
                  Currently running in <strong>Guest Mode</strong> (full local & backend error detection enabled).
                </p>
                <input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded transition"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign In</span>
                </button>
                {authMessage && (
                  <p className="text-[11px] text-slate-600 text-center">{authMessage}</p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Right Columns: Configuration Sections */}
        <div className="space-y-6 md:col-span-2">
          {/* Voice Personality System */}
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                <Flame className="w-4 h-4 text-rose-600" />
                <span>Voice Assistant Personality</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Active: {settings.voice_personality.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { 
                  id: 'professional', 
                  title: 'Professional', 
                  desc: 'Clean, objective warning alerts.',
                  sample: '"Warning! Incorrect loop condition on line 8."'
                },
                { 
                  id: 'friendly', 
                  title: 'Friendly Bro', 
                  desc: 'Hinglish buddy tone.',
                  sample: '"Bhai, loop condition check kar lo. Kuch galat lag raha hai."'
                },
                { 
                  id: 'roast', 
                  title: 'Desi Roast Mode', 
                  desc: 'Savage & funny reality checks.',
                  sample: settings.profanity_enabled 
                    ? '"Abe laude, ye line galat likh di! Loop condition check kar!"'
                    : '"Abe, i <= n kyu likha? i < n hona chahiye!"'
                }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSettings({ ...settings, voice_personality: item.id as VoicePersonality })}
                  className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                    settings.voice_personality === item.id
                      ? item.id === 'roast'
                        ? 'border-rose-500 bg-rose-50/70 ring-1 ring-rose-500'
                        : 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <h3 className={`text-xs font-bold ${settings.voice_personality === item.id && item.id === 'roast' ? 'text-rose-900' : 'text-slate-900'}`}>
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <p className="text-[10px] italic text-slate-600 mt-2 bg-white/70 p-1.5 rounded border border-slate-100">
                    {item.sample}
                  </p>
                </div>
              ))}
            </div>

            {/* Profanity Configuration */}
            {settings.voice_personality === 'roast' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <div>
                    <p className="text-xs font-bold text-rose-900">Unfiltered Profanity in Roast Mode</p>
                    <p className="text-[11px] text-rose-700">
                      When enabled, uses unfiltered words ("Abe laude...", "Oye laude..."). When disabled, uses clean hilarious roasts ("Abe coder...", "Bhai kya kar raha hai...").
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.profanity_enabled}
                  onChange={(e) => setSettings({ ...settings, profanity_enabled: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500 ml-4 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Custom Voice Message Templates */}
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Custom Voice Message Overrides</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Customize what CodeSense AI speaks for specific error categories. Use <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">{"{line}"}</code> to insert the line number.
            </p>

            <div className="flex space-x-2">
              <select
                value={customTemplateKey}
                onChange={(e) => setCustomTemplateKey(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="boundary">Boundary / Off-by-one</option>
                <option value="syntax">Syntax & Brackets</option>
                <option value="logic">Logical & Returns</option>
                <option value="type">Variable & Types</option>
                <option value="infinite_loop">Infinite Loops</option>
              </select>
              <input
                type="text"
                placeholder='e.g. "Oye coder, line {line} pe loop boundary check kar!"'
                value={customTemplateVal}
                onChange={(e) => setCustomTemplateVal(e.target.value)}
                className="flex-1 text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                onClick={handleSetCustomTemplate}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-800 transition"
              >
                Set
              </button>
            </div>

            {settings.custom_voice_templates && Object.keys(settings.custom_voice_templates).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {Object.entries(settings.custom_voice_templates).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-700 capitalize mr-2">{key}:</span>
                      <span className="text-slate-600">{val}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomTemplate(key)}
                      className="text-rose-500 hover:text-rose-700 text-[11px] font-medium"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice Engine Settings */}
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span>Voice Playback & Cooldown</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Voice Language</label>
                <select
                  value={settings.voice_language}
                  onChange={(e) => setSettings({ ...settings, voice_language: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-IN">Indian English (en-IN)</option>
                  <option value="hi-IN">Hindi (हिन्दी)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Speech Rate ({settings.speech_rate}x)</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={settings.speech_rate}
                  onChange={(e) => setSettings({ ...settings, speech_rate: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 mt-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Volume ({Math.round(settings.speech_volume * 100)}%)</label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={settings.speech_volume}
                  onChange={(e) => setSettings({ ...settings, speech_volume: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 mt-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Anti-Spam Alert Cooldown</label>
                <select
                  value={settings.alert_cooldown}
                  onChange={(e) => setSettings({ ...settings, alert_cooldown: parseInt(e.target.value) })}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="2000">2 Seconds (Fast)</option>
                  <option value="3000">3 Seconds (Standard Recommended)</option>
                  <option value="5000">5 Seconds (Relaxed)</option>
                  <option value="8000">8 Seconds (Minimal)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Enabled Programming Languages */}
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
              <Code className="w-4 h-4 text-emerald-600" />
              <span>Active Programming Languages</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {[
                { id: 'java', label: 'Java (Parser & AST)' },
                { id: 'python', label: 'Python (AST & Ruff)' },
                { id: 'cpp', label: 'C++ (Clang / Syntax)' },
                { id: 'javascript', label: 'JavaScript' },
                { id: 'c', label: 'C Language' }
              ].map((lang) => {
                const checked = (settings.enabled_languages || []).includes(lang.id);
                return (
                  <label key={lang.id} className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLanguage(lang.id)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                    />
                    <span>{lang.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
