import { AlertTriangle, AudioLines, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';

function App() {
  const [enabled, setEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [language, setLanguage] = useState('English');
  const [backendStatus, setBackendStatus] = useState('Checking...');

  const pingBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      setBackendStatus(data.status === 'ok' ? 'Connected' : 'Unavailable');
    } catch {
      setBackendStatus('Offline');
    }
  };

  return (
    <div className="shell">
      <header className="header">
        <div className="logo-block">
          <Sparkles size={18} />
          <div>
            <div className="title">CodeSense AI</div>
            <div className="subtitle">Detect mistakes while you code.</div>
          </div>
        </div>
        <button className={`toggle ${enabled ? 'on' : ''}`} onClick={() => setEnabled((value) => !value)}>
          {enabled ? 'On' : 'Off'}
        </button>
      </header>

      <main className="panel">
        <div className="setting-row">
          <span>Voice alerts</span>
          <button className={`toggle ${voiceEnabled ? 'on' : ''}`} onClick={() => setVoiceEnabled((value) => !value)}>
            {voiceEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="setting-row">
          <span>Language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option>English</option>
            <option>Hindi</option>
          </select>
        </div>

        <div className="setting-row">
          <span>Analysis mode</span>
          <span className="tag">Balanced</span>
        </div>

        <div className="setting-row">
          <AudioLines size={16} />
          <span>Speech synthesis ready</span>
        </div>

        <div className="setting-row">
          <AlertTriangle size={16} />
          <span>Low-noise diagnostics</span>
        </div>

        <div className="setting-row">
          <ShieldCheck size={16} />
          <span>Privacy first</span>
        </div>

        <button className="primary" onClick={pingBackend}>Check backend</button>
        <div className="status">Status: {backendStatus}</div>
      </main>
    </div>
  );
}

export default App;
