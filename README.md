# CodeSense AI

> **Detect Mistakes While You Code. Don't Wait to Run.**

CodeSense AI is an AI-powered Chrome Extension and FastAPI backend that detects programming errors in real time as you write code on online coding platforms (LeetCode, GeeksforGeeks, HackerRank, CodeChef, and Codeforces).

Instead of forcing developers to repeatedly click **Run**, **Compile**, or **Submit**, CodeSense AI highlights the exact erroneous line with a subtle red squiggly underline and immediately speaks a concise, natural voice explanation.

---

## 1. Product Vision & Core Experience

### Distraction-Free Design
CodeSense AI adheres to a strict zero-distraction principle:
- ❌ **No intrusive chatbots or overlays** covering your code editor.
- ❌ **No repeated popups** or unwanted automated code replacements.
- ❌ **No speech spam**: Identical errors are deduplicated with fingerprinting, and a cooldown prevents repeated alerts for unchanged mistakes.
- ✅ **Subtle red squiggly underline** on the exact erroneous line without shifting cursor or blocking typing.
- ✅ **Intelligent voice alert** speaking short, natural explanations (English & Hindi supported).

---

## 2. Complete Tech Stack

| Layer | Technologies |
|---|---|
| **Browser Extension** | Manifest V3, TypeScript, React 19, Tailwind CSS, Lucide Icons, Vite |
| **Editor Bridges** | Monaco Editor (`deltaDecorations`), CodeMirror 5/6, Isolated MAIN World bridge |
| **Voice Engine** | Web Speech API (`window.speechSynthesis`, `SpeechSynthesisUtterance`) |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Uvicorn, Async HTTPX |
| **Static Analyzers** | Python AST visitor, Java AST/compiler parser, Clang/C++ analyzer, JavaScript analyzer |
| **AI Analysis Engine** | Configurable OpenAI-compatible LLM abstraction (OpenAI, Groq, Ollama, DeepSeek) |
| **Database & Auth** | Supabase PostgreSQL, Row Level Security (RLS), Supabase Auth & JWTs, Guest Mode fallback |

---

## 3. Project Architecture

```text
CodeSense AI
│
├── extension/                       # Chrome Extension (Manifest V3)
│   ├── dist/                        # Production build ready for Chrome
│   ├── public/                      # Manifest, icons, bridge resources
│   ├── src/
│   │   ├── background/              # Service worker (lifecycle & storage sync)
│   │   ├── content/                 # Content script & platform adapters
│   │   │   ├── bridge.ts            # MAIN world Monaco/CodeMirror bridge
│   │   │   ├── editor-monitor.ts    # Debounced real-time change detector
│   │   │   ├── local-analyzer.ts    # Browser-side fast syntax fallback
│   │   │   ├── voice-engine.ts      # Web Speech API anti-spam voice alerts
│   │   │   └── adapters/            # LeetCode, GFG, HackerRank, CodeChef, Codeforces
│   │   ├── popup/                   # Minimalist extension popup UI (React + Tailwind)
│   │   ├── options/                 # Full options & account management UI
│   │   ├── types/                   # TypeScript schemas & message protocols
│   │   └── utils/                   # Fingerprinting, storage, API client
│   └── vite.config.ts               # Multi-entry build pipeline
│
├── backend/                         # FastAPI Backend
│   ├── app/
│   │   ├── main.py                  # FastAPI app & CORS configuration
│   │   ├── config.py                # Pydantic Settings
│   │   ├── api/                     # REST endpoints (/analyze, /health, /settings, /usage)
│   │   ├── analyzers/               # Java, Python, C++, C, JavaScript static analyzers
│   │   ├── ai/                      # LLM provider, prompts, response validator
│   │   ├── database/                # Supabase client, repositories, Guest mode fallback
│   │   └── services/                # Analysis orchestrator, voice generator, usage tracker
│   ├── tests/                       # Pytest test suite (17 passed unit & API tests)
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Production Docker image
│   └── .env.example                 # Environment variables template
│
├── supabase/                        # Database migrations
│   └── migrations/
│       └── 001_initial_schema.sql   # Tables (profiles, user_settings, history, usage) + RLS
│
├── tests/                           # Integration & End-to-End Tests
│   └── e2e_flow.test.js             # End-to-end full flow lifecycle simulation
│
├── start_backend.bat                # 1-click backend launcher
└── run_tests.bat                    # 1-click test runner
```

---

## 4. Multi-Language Error Detection

CodeSense AI provides language-specific syntax, semantic, and logical diagnostics:

### ☕ Java
- Missing semicolons at statement ends.
- Unmatched braces `{`, `}`, `(`, `)`, `[`, `]`.
- Loop boundary errors (e.g. `i <= arr.length` causing `ArrayIndexOutOfBoundsException`).
- String reference comparison (`==` instead of `.equals()`).
- Method return statements and JDK `javac` compiler diagnostics.

### 🐍 Python
- AST-level syntax validation and indentation error detection.
- Missing colons after block statements (`def`, `class`, `if`, `for`, `while`, `try`).
- Dangerous mutable default arguments (`def func(a=[])`).
- Unreachable code after `return` or `raise`.
- Suspicious comparisons (`if x is 5:` or `== None`).
- Loop range off-by-one errors (`range(len(arr) + 1)`).

### ⚙️ C & C++
- Semicolon requirements (including structs and classes `struct Point { int x; };`).
- Inadvertent assignments in conditions (`if (x = 0)`).
- Loop bounds and array index violations (`i <= arr.size()`).
- Unmatched delimiters and pointer dereference issues.

### 🌐 JavaScript
- Delimiter and bracket balance stack.
- Assignment in conditions (`if (x = 5)` instead of `===`).
- Off-by-one boundary risks on arrays.

---

## 5. Voice Alert Engine & Anti-Spam System

- Built on the browser's native **Web Speech API** (`window.speechSynthesis`). Requires **no paid external TTS API**.
- **Anti-Spam Features**:
  1. **Deterministic Fingerprints**: Every error gets a stable identifier (`language:line:category:hash`).
  2. **Deduplication**: The same error will not be spoken repeatedly while the user continues typing.
  3. **Alert Cooldown**: Configurable cooldown (default 3000ms) prevents overlapping speech.
  4. **Error Correction Tracking**: When an error is fixed, its fingerprint is cleared so future occurrences can be alerted again.
  5. **Natural Utterances**: Generates natural speech in English and Hindi (e.g., *"Warning! Incorrect loop condition on line 8."*).

---

## 6. Installation & Quick Start

### Prerequisites
- Node.js 18+ (tested with v26.13)
- Python 3.11+ (tested with Python 3.12.10)
- Google Chrome or Chromium-based browser (Brave, Edge)

### 1. Build the Chrome Extension
```bash
cd extension
npm install
npm run build
```
This produces the bundled extension in `extension/dist/`.

### 2. Load the Extension in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `extension/dist` directory.
5. The **CodeSense AI** extension icon will appear in your Chrome toolbar!

### 3. Start the Backend
```bash
# In project root
# Double click start_backend.bat OR run via command line:
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will be live at `http://localhost:8000`. You can test `/health` or view interactive OpenAPI docs at `http://localhost:8000/docs`.

---

## 7. Configuration & Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure your credentials:

```ini
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=False

# AI Provider (OpenAI-compatible)
# Supports OpenAI, Groq, Ollama, DeepSeek, Local LLM proxies
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
AI_TIMEOUT_SECONDS=8.0

# Supabase (Optional - Guest mode works without Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Guest Mode vs Authenticated Mode
- **Guest Mode (Default)**: If Supabase credentials are not configured, CodeSense AI runs seamlessly with full local static analysis, backend code analysis, and voice alerts. Settings are persisted locally in `chrome.storage.sync`.
- **Authenticated Mode**: With Supabase configured, users can sign up, log in, synchronize preferences across devices, and optionally save diagnostic history.

---

## 8. Supabase Database Setup

If you wish to enable persistent cloud settings and history:
1. Create a project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/migrations/001_initial_schema.sql` and run the script.
4. The migration will create:
   - `profiles` with Row Level Security (RLS)
   - `user_settings` with RLS
   - `diagnostic_history` with RLS
   - `usage_logs` with RLS
   - Optimized indexes on `user_id` and timestamps.

---

## 9. Running Automated Tests

Run the full automated test suite (backend pytest + extension unit tests + e2e simulation):

```bash
# Run 1-click batch script
run_tests.bat

# OR run via terminal:
npm run test:all
python -m pytest backend/tests -v
```

### Test Results
- ✅ **17 Backend Pytest Tests**: Passing (AI validator, Java/Python/C++/JS analyzers, health API, settings CRUD, usage stats, voice generator).
- ✅ **Extension Unit Tests**: Passing (diagnostic fingerprinting, bracket matching stack).
- ✅ **End-to-End Simulation Test**: Passing (verifies full lifecycle: Type Bug → Highlight line in red → Voice speaks → User fixes bug → Underline clears → Spoken cache resets).

---

## 10. Platform Compatibility

| Platform | Editor Used | Status | Highlighting Mechanism |
|---|---|---|---|
| **LeetCode** | Monaco Editor | Supported | Monaco `deltaDecorations` (red squiggly underline) + DOM fallback |
| **GeeksforGeeks** | Monaco / CodeMirror | Supported | Delta decorations & CodeMirror markText |
| **HackerRank** | Monaco / CodeMirror | Supported | Delta decorations & CodeMirror markText |
| **CodeChef** | Monaco / Ace | Supported | Delta decorations & DOM highlight fallback |
| **Codeforces** | Textarea / Ace | Supported | Line error indicator badge & voice alert |

---

## 11. Security & Privacy

1. **Privacy-First**: Source code is processed ephemerally in memory and is **never stored** unless the user explicitly enables "Save Diagnostic History".
2. **Debounced & Efficient**: Requests are debounced (600ms) to ensure minimal network traffic and zero editor freezing.
3. **Local Offline Fallback**: If the backend is unreachable or offline, the Chrome Extension continues detecting syntax and bracket errors locally in the browser.
4. **No Secret Leaks**: API keys and service-role secrets are kept exclusively in the backend `.env` file and never bundled into the Chrome extension.

---

## License
MIT License. Built for programmers who want to catch bugs as they code.
