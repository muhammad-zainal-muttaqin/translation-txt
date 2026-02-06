# CLAUDE.md - AI Assistant Guide for TranslationTXT

## Project Overview

**TranslationTXT** is a client-side web application for translating text files using LLM API providers (OpenRouter, Cerebras, Google Gemini). It is a static site (no build step, no bundler, no server-side code) deployed on Vercel.

- **Live**: https://translation-txt.vercel.app
- **License**: MIT (Muhammad Zainal Muttaqin)
- **Version**: 2.0 Final

## Repository Structure

```
translation-txt/
├── index.html          # Single-page HTML (all UI markup)
├── script.js           # All application logic (~950 lines, vanilla JS)
├── style.css           # All styles (~600 lines, CSS custom properties)
├── sw.js               # Service Worker for PWA offline caching
├── manifest.json       # PWA manifest
├── vercel.json         # Vercel deployment config (security headers)
├── robots.txt          # Search engine crawling rules
├── LICENSE             # MIT License
├── README.md           # Project documentation
└── .gitignore          # Standard Node/.env/editor ignores
```

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no frameworks, no dependencies)
- **Deployment**: Vercel (auto-deploy from GitHub, zero config)
- **PWA**: Service Worker (`sw.js`) + Web App Manifest (`manifest.json`)
- **External CDN**: JSZip (loaded on-demand for ZIP downloads only)
- **No build tools**: No npm, no bundler, no transpiler. Edit files directly.

## Architecture & Key Patterns

### script.js Organization

The entire app lives inside a single `DOMContentLoaded` callback. Key internal modules:

| Module/Object | Purpose |
|---|---|
| `elements` | Centralized DOM element references (cached on init) |
| `state` | Application state: uploaded file, chunks, API config, abort flag |
| `errorHandling` | Show/hide error messages |
| `apiManagement` | Load/save API keys & model names to `localStorage`, set endpoints per provider |
| `fileHandling` | File upload via drag-and-drop or file input |
| `buildRobustTranslationPrompt()` | Builds format-specific translation prompts (TXT, CSV, MD, JSON, SRT, VTT, XML, YAML, LOG) |
| `splitFileContent()` / `mergeChunks()` | Chunk splitting with configurable overlap, smart merge to avoid duplication |
| `translateChunk()` | Sends chunk to selected API provider with retry logic (max 2 retries) |
| `startTranslation()` | Main translation loop: sequential chunk processing with progress |
| `callGoogle()` / `callOpenRouter()` / `callCerebras()` | Provider-specific API call functions |

### API Provider Endpoints

- **OpenRouter**: `https://openrouter.ai/api/v1/chat/completions` (Bearer token auth)
- **Cerebras**: `https://api.cerebras.ai/v1/chat/completions` (Bearer token auth)
- **Google Gemini**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (API key in query param)

### State Management

All state is in the `state` object (in-memory) and `localStorage` (API keys, model names). No external state library. Keys stored per provider: `{provider}_api_key`, `{provider}_model_name`.

### CSS Architecture

- CSS custom properties (`:root` variables) for theming
- Glassmorphism design: `backdrop-filter: blur()`, semi-transparent backgrounds
- Dark theme only (no light mode)
- Responsive: mobile breakpoint at 768px
- Button classes: `.start`, `.resume`, `.pause`, `.cancel`, `.clear-all`, `.download-txt`, `.download-zip`, `.copy-clipboard`

## Development Workflow

### No Build Step

There is **no package.json, no npm, no build process**. To develop:

1. Edit `index.html`, `script.js`, or `style.css` directly
2. Open `index.html` in a browser (or use a local HTTP server for Service Worker testing)
3. Commit and push to GitHub for Vercel auto-deploy

### Testing

There are **no automated tests**. Manual testing is done by:
1. Opening the app in a browser
2. Uploading a text file
3. Configuring an API provider/key
4. Running a translation and verifying output

### Deployment

- Vercel auto-deploys from the GitHub `main` branch
- `vercel.json` configures security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- No environment variables needed server-side (all API keys are client-side in localStorage)

## Coding Conventions

- **No frameworks or libraries** - vanilla JS only (JSZip loaded from CDN on demand)
- **Single file per concern**: one HTML, one JS, one CSS
- **DOM references** cached in `elements` object at startup
- **State** centralized in `state` object
- **Functions** organized by feature area (file handling, API, translation, UI)
- **Error handling** via `errorHandling.show()`/`errorHandling.hide()` and `log()` for the log panel
- **No semicolons inconsistency**: the code uses semicolons (keep consistent)
- **String templates** for dynamic content (backtick template literals)
- **async/await** for all API calls and async operations
- **Commit messages** are descriptive, in English, present tense (e.g., "Add real-time progress indicators")

## Supported File Formats

TXT, CSV, MD, JSON, SRT, VTT, XML, YAML/YML, LOG - each has format-specific translation prompt rules in `buildRobustTranslationPrompt()`.

## Important Notes for AI Assistants

1. **No build/install step** - don't run `npm install` or any build commands
2. **All logic is in `script.js`** - this is the main file you'll edit for feature changes
3. **All styles in `style.css`** - uses CSS custom properties for consistency
4. **All markup in `index.html`** - single page, no routing
5. **API keys are never committed** - they live in the user's browser localStorage
6. **Service Worker cache version** is in `sw.js` (`CACHE_NAME`) - bump this when deploying significant changes
7. **The default translation instruction** preserves kinship terms and honorifics in romaji (Japanese translation context)
8. **Translation quality validation** checks if translated text differs enough from source (80% threshold)
9. **Chunk overlap** prevents context loss between chunks; `mergeChunks()` deduplicates overlap lines
10. **Pause feature** is not yet implemented (button exists but logs "not available yet")
