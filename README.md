# âœ¦ SnippetySnipSnip (SSS / Snippy / Snippety)

A production-ready, local-first browser extension for text snippets, templates,
nested folders, variables, and automation. Works on Firefox, Chrome, Edge, and
Chromium-based browsers.

---

## Quick start

### Prerequisites
- Node.js 20+
- npm 10+

### Install dependencies
```bash
npm install
```

### Build for Firefox
```powershell
$env:MODE="firefox"
npm run build
```

### Build for Chrome / Edge / Comet
```powershell
$env:MODE="chrome"
npm run build
```

### Run in Firefox (web-ext, no pre-existing profile needed)
```powershell
$env:MODE="firefox"
npm run build
npx web-ext run --source-dir dist-firefox
```

### Load in Chrome / Edge / Comet
1. Build for chrome (above)
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** â†’ select `dist-chrome`

---

## Project structure
src/
background/ # Background service worker / persistent background script
content/ # Content script â€” injection, triggers, palette, modal, automation
core/ # Shared data model, storage, factories, variable engine
popup/ # Popup React UI â€” snippet list, search, insert
options/ # Options page React UI â€” settings, env vars, import/export
manifests/
manifest.firefox.json
manifest.chrome.json

---

## Features

- Nested folders with unlimited depth
- Rich snippet content: richtext, code, table, signature, raw HTML, URL autofill
- Full variable engine: text input, dropdown, chained dropdown, date, time,
  counter, clipboard, read from page, conditional, repeating section,
  cursor position, environment refs
- Inline `/trigger` expansion in any text field or contenteditable
- Shadow DOM command palette with fuzzy search and keyboard navigation
- Expansion modal with live preview, Tab/Enter/Esc navigation
- Automation steps: keypress, click, input, scroll, wait, assert, iframe, webhook
- Favorites, tags, usage counters, snippet locking, site whitelist/blacklist
- Version history with restore (up to 20 versions per snippet)
- Import / export JSON backup
- Environment variables ({{env.key}})
- Dark / light / system theme
- Optional browser.storage.sync toggle
- Fully offline â€” no backend required
- No chrome.* calls â€” uses webextension-polyfill (browser.*) everywhere

---

## Dependency management

Check for vulnerabilities at any time:
```bash
npm audit
```

Update dependencies safely:
```bash
npm outdated
npm update <package-name>
```

For major version bumps always check the changelog before updating.
The lockfile (`package-lock.json`) is committed â€” always run `npm ci` in CI
environments for reproducible installs.

---

## Security notes

- All injected UI runs inside Shadow DOM â€” fully isolated from host pages
- No data is ever sent to any server unless you configure a self-hosted backend
- The self-hosted backend URL is optional and disabled by default
- browser.storage.sync is opt-in only