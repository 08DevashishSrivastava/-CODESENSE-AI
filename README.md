# CodeSense AI

> Real-time programming error detection for online coding platforms.

CodeSense AI is a Manifest V3 Chrome extension with a FastAPI analysis backend. It watches supported online code editors while you type, detects likely syntax, type, boundary, logic, and runtime problems, highlights the relevant code location, and can explain the problem through the browser's native text-to-speech engine.

The project is designed for developers and learners who want useful feedback before pressing **Run**, **Compile**, or **Submit**. It combines fast browser-side checks with backend static analysis and optional AI-assisted reasoning, while keeping the editor experience quiet and non-blocking.

## Contents

- [Key capabilities](#key-capabilities)
- [How the system works](#how-the-system-works)
- [Supported platforms and languages](#supported-platforms-and-languages)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Load the extension in Chrome](#load-the-extension-in-chrome)
- [Backend configuration](#backend-configuration)
- [Supabase setup](#supabase-setup)
- [Settings and voice modes](#settings-and-voice-modes)
- [API overview](#api-overview)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security and privacy](#security-and-privacy)
- [Development workflow](#development-workflow)
- [Contributing](#contributing)
- [License](#license)

## Key capabilities

### Real-time diagnostics

- Debounced editor monitoring avoids interrupting typing or sending a request for every keystroke.
- Browser-side local analysis provides immediate feedback for common syntax mistakes.
- Backend analysis adds language-specific static checks and optional AI reasoning.
- Results are versioned so stale responses cannot overwrite newer editor state.
- Duplicate diagnostics are merged before they are displayed or spoken.

### Editor-aware highlighting

CodeSense AI uses platform adapters and editor bridges rather than assuming that every website exposes code in the same way.

- Monaco Editor support through editor model access and decorations.
- CodeMirror support for common CodeMirror 5 and CodeMirror 6 layouts.
- Textarea and DOM fallbacks for platforms with limited editor APIs.
- Red squiggly-style decorations or line indicators without replacing the user's code.

### Voice explanations

The extension uses the browser's native Web Speech API, so a separate text-to-speech service is not required.

- Professional, friendly, and Desi Roast voice personalities.
- English and Hindi voice-language options, subject to voices installed by the operating system and browser.
- Adjustable speech rate, volume, cooldown, and voice selection.
- Custom voice templates for teams or personal learning preferences.
- Fingerprint-based deduplication prevents repeated speech for the same unchanged error.
- Resolved errors are removed from the spoken-error cache and can be announced again if they reappear.

### Guest-first operation

The extension can run without Supabase credentials. In guest mode, settings are stored locally and the application can use local analysis plus the configured backend. Supabase is optional for authentication, synchronized settings, history, and usage tracking.

## How the system works

The normal analysis lifecycle is:

```text
User edits code
      |
      v
Platform adapter reads editor state
      |
      v
Debounce editor changes and assign a code version
      |
      +--> Local browser analyzer returns immediate syntax diagnostics
      |
      +--> FastAPI backend runs static analyzers and optional AI validation
      |
      v
Merge, fingerprint, and validate diagnostics
      |
      +--> Apply editor decorations
      |
      +--> Generate a concise voice explanation
```

If the backend is unavailable, the extension keeps local diagnostics active. If code changes while a backend request is in flight, the response is discarded when its version is no longer current.

## Supported platforms and languages

### Online platforms

| Platform | Typical editor | Adapter status |
| --- | --- | --- |
| LeetCode | Monaco | Supported |
| GeeksforGeeks | Monaco or CodeMirror | Supported |
| HackerRank | Monaco or CodeMirror | Supported |
| CodeChef | Monaco or Ace | Supported |
| Codeforces | Textarea or Ace | Supported |

Websites can change their DOM and editor implementation. The adapter layer isolates those changes so an individual platform can be updated without rewriting the analyzer.

### Analysis languages

The primary language identifiers are `python`, `java`, `cpp`, `c`, and `javascript`.

Examples of checks include:

- Python block colons, indentation problems, suspicious assignments, and bracket mismatches.
- Java statement termination, delimiters, loop-boundary risks, and common reference-comparison mistakes.
- C and C++ semicolon, delimiter, condition-assignment, and array-boundary checks.
- JavaScript delimiter balance, assignment inside conditions, and common boundary warnings.

Static analysis is advisory. A warning is a signal to review the code, not a guarantee that the program will fail.

## Repository structure

```text
.
|-- extension/
|   |-- adapters/                 Legacy unpacked-extension adapters
|   |-- background.js             Legacy Manifest V3 service worker
|   |-- content.js                Legacy content script
|   |-- manifest.json             Legacy unpacked-extension manifest
|   |-- public/                   Vite public assets and build manifest
|   |-- src/
|   |   |-- background/           TypeScript service worker
|   |   |-- content/              Bridges, monitors, analyzers, adapters
|   |   |-- options/              Full settings page
|   |   |-- popup/                Toolbar popup
|   |   |-- types/                Shared TypeScript contracts
|   |   `-- utils/                API, storage, debounce, fingerprints
|   |-- tests/                    Extension unit tests
|   |-- vite.config.ts            Multi-entry Vite build configuration
|   `-- dist/                     Generated production extension
|-- backend/
|   |-- app/
|   |   |-- api/                  FastAPI route modules
|   |   |-- analyzers/             Language-specific analyzers
|   |   |-- ai/                   Provider abstraction and response validation
|   |   |-- database/              Supabase client and repositories
|   |   |-- schemas/               Pydantic request and response models
|   |   `-- services/              Analysis, voice, and usage orchestration
|   |-- tests/                    Backend pytest suite
|   |-- requirements.txt
|   |-- Dockerfile
|   `-- .env.example
|-- supabase/migrations/           Database schema migrations
|-- tests/e2e_flow.test.js         Extension lifecycle simulation
|-- start_backend.bat              Windows backend launcher
|-- run_tests.bat                  Windows full test runner
`-- docker-compose.yml             Container development setup
```

### Which extension folder should be loaded?

There are two supported development paths in the repository:

1. **Legacy unpacked path:** load `extension/`. Its root [manifest.json](extension/manifest.json) references `background.js`, `content.js`, and the root `adapters/` directory.
2. **Vite production path:** run `npm run build:extension`, then load `extension/dist/`. Its generated manifest references the bundled `service-worker.js` and `content.js`.

When developing the TypeScript and React source under `extension/src`, use the Vite production path after rebuilding. Chrome must always be given a folder containing `manifest.json` directly; do not select the parent repository folder and do not select the manifest file itself.

## Requirements

- Google Chrome or another Chromium-based browser with Manifest V3 support.
- Node.js 18 or newer. Node.js 22+ is recommended.
- Python 3.11 or newer. Python 3.12 is used by the current test workflow.
- A local backend is optional for browser-only local syntax checks, but recommended for complete diagnostics.
- Supabase is optional. Guest mode works without it.

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/08DevashishSrivastava/-CODESENSE-AI.git
cd -CODESENSE-AI
```

### 2. Install extension dependencies

```bash
cd extension
npm install
cd ..
```

### 3. Start the backend

On Windows, double-click `start_backend.bat`, or run the backend directly:

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate

pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify that the backend is responding at `http://localhost:8000/health`. Interactive API documentation is available at `http://localhost:8000/docs`.

### 4. Build the extension

From the repository root:

```bash
npm run build:extension
```

Or from the extension directory:

```bash
cd extension
npm run build
```

## Load the extension in Chrome

### Recommended: load the production build

1. Run `npm run build:extension` from the repository root.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select `extension/dist`.
6. Confirm that the extension card appears.
7. Pin CodeSense AI from the Chrome extensions menu if desired.

### Alternative: load the root legacy extension

The root [extension/manifest.json](extension/manifest.json) is also loadable directly:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension` folder, not the repository root.

The selected folder must contain `manifest.json` at its top level. If Chrome reports **Manifest file is missing or unreadable**, the wrong directory was selected or the folder was not extracted from the ZIP archive.

## Backend configuration

Copy the environment template before enabling optional services:

```powershell
Copy-Item backend/.env.example backend/.env
```

Important configuration areas include:

```ini
HOST=127.0.0.1
PORT=8000
DEBUG=False

# Optional OpenAI-compatible provider
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
AI_TIMEOUT_SECONDS=8.0

# Optional Supabase integration
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never commit `backend/.env`. API keys, Supabase service-role keys, and access tokens must remain outside source control.

### Analysis modes

The extension supports configurable analysis behavior:

- **Static:** prioritize deterministic local and backend static analyzers.
- **AI:** use backend AI analysis where configured.
- **Hybrid:** combine local checks, static analysis, and AI validation when available.

The backend remains useful without an AI key. In that case, static analyzers continue to provide deterministic diagnostics.

## Supabase setup

Supabase is only required for authenticated settings, synchronized preferences, diagnostic history, and usage tracking.

1. Create a Supabase project.
2. Copy the project URL and anon key into `backend/.env`.
3. Apply the migrations in `supabase/migrations/` using the Supabase SQL Editor or your migration workflow.
4. Configure authentication if account login is enabled.
5. Restart the backend after changing environment variables.

The migrations create the application tables, indexes, constraints, and row-level security policies. Review policies in your own Supabase project before deploying publicly.

## Settings and voice modes

The extension settings include:

- Enable or disable analysis and voice alerts.
- Select language and browser voice.
- Choose `professional`, `friendly`, or `roast` personality.
- Enable profanity only when explicitly desired for roast mode.
- Configure speech rate, volume, cooldown, and enabled languages.
- Choose static, AI, or hybrid analysis.
- Enable or disable history saving.
- Configure the backend URL and custom voice templates.

Voice output depends on the voices installed in the operating system. If Hindi speech is unavailable, install a Hindi system voice or select a compatible browser voice with an `hi-IN` language tag.

## API overview

The backend is a FastAPI application. The most important routes are:

| Route | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Backend availability check |
| `/api/v1/analyze` | POST | Run the configured analysis pipeline |
| `/api/v1/analyze/static` | POST | Run static analysis only |
| `/api/v1/analyze/ai` | POST | Request AI-assisted analysis |
| `/docs` | GET | OpenAPI / Swagger documentation |

Example analysis request:

```json
{
  "language": "python",
  "code": "if value == 1\n    print(value)",
  "problem_context": {
    "title": "Demo problem",
    "description": "Print a value"
  },
  "code_version": 1
}
```

Diagnostics use a stable structure containing an identifier, line and column information, category, message, severity, confidence, source, and optional voice text. This structure lets the extension render results consistently across all supported editors.

## Testing

Run the complete JavaScript suite from the repository root:

```bash
npm run test:all
```

Run the backend suite:

```bash
python -m pytest backend/tests -v
```

On Windows, the combined helper is:

```bat
run_tests.bat
```

The test coverage includes diagnostic fingerprints, local syntax analysis, language analyzers, AI response validation, voice-message generation, backend API behavior, and the end-to-end lifecycle from typing a bug to clearing the diagnostic after a fix.

Run a production build before loading a changed extension into Chrome:

```bash
npm run build:extension
```

## Troubleshooting

### Chrome says “Manifest file is missing or unreadable”

Select the folder containing `manifest.json` directly:

```text
C:\Users\asus\Desktop\Extension\extension
```

Do not select the parent repository folder, the ZIP file, or `manifest.json` itself.

### The extension appears but does not analyze code

1. Reload the supported webpage after installing or updating the extension.
2. Confirm that the backend is running at `http://localhost:8000`.
3. Open `chrome://extensions` and click **Service worker > Inspect**.
4. Check the browser console for content-script or permission errors.
5. Confirm that the current site is one of the supported platforms.
6. Check that the selected language is enabled in extension settings.

### The service worker says “Inactive”

This is normal for Manifest V3. Chrome suspends idle service workers and wakes them when an extension event occurs. Open **Inspect** from the extension card to see runtime logs.

### Voice alerts do not play

- Confirm that voice alerts are enabled.
- Check the browser and operating-system volume.
- Verify that the selected language has an installed speech voice.
- Interact with the page first if the browser blocks speech before user interaction.
- Increase the speech volume or reduce the alert cooldown if necessary.

### Backend requests fail

- Open `http://localhost:8000/health`.
- Confirm the configured backend URL has no trailing path errors.
- Check that the backend port is not already occupied.
- Review the FastAPI terminal logs.
- Use `http://127.0.0.1:8000` if `localhost` resolution is problematic.

## Security and privacy

- Source code is analyzed in memory and is not persisted by default.
- History saving is opt-in.
- AI and Supabase credentials remain in the backend environment, not in the extension bundle.
- The extension requests access only to the supported coding platforms and configured local backend.
- Backend responses are validated before diagnostics are applied.
- Code-version checks prevent stale network results from changing newer editor state.

Before deploying to production, review host permissions, CORS configuration, Supabase RLS policies, authentication settings, and logging behavior for your environment.

## Development workflow

### Extension development

```bash
cd extension
npm install
npm run build
```

For iterative UI work, run Vite in development mode and rebuild when testing the unpacked extension in Chrome:

```bash
npm run dev
```

The production extension is generated in `extension/dist`. Build output is generated content; edit files under `extension/src` instead of editing bundled JavaScript directly.

### Backend development

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

When adding a language analyzer, keep analyzer output compatible with the shared diagnostic schema and add focused tests before updating the extension rendering layer.

### Pull request checklist

- Run `npm run test:all`.
- Run `python -m pytest backend/tests -v`.
- Run `npm run build:extension`.
- Verify the changed files on at least one supported platform.
- Check that no `.env`, API key, token, cache, or generated temporary file is included.
- Update this README when setup, supported platforms, or configuration behavior changes.

## Contributing

Issues and pull requests are welcome. Please include a clear description, reproduction steps, browser and platform details, relevant logs with secrets removed, and tests covering new analyzer or extension behavior where practical.

Keep user-facing diagnostics concise and actionable. Avoid noisy alerts, destructive automatic edits, or diagnostics that claim certainty when the analyzer only has a low-confidence signal.

## License

This project is released under the MIT License.
