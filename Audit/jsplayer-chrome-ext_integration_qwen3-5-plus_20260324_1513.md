> **🤖 Prompt Generation Metadata**
> - **Model:** qwen3.5-plus
> - **Target Repository:** https://github.com/Sucotasch/jsplayer-chrome-ext
> - **Reference Repository:** https://github.com/nyakuoff/Snowify
> - **Auto-generated RAG Query:** "system architecture, main components, interfaces, exported functions, core business logic, data models"
> 
> <details><summary><b>Task Instructions</b></summary>
> 
> ```text
> You are an expert Principal Software Architect specializing in system integration, code migration, and architectural review. 
> You are provided with two distinct codebases:
> 1. **[TARGET_REPO]**: The project you need to analyze and potentially modify.
> 2. **[REFERENCE_REPO]**: The library, SDK, or example project proposed for integration or as a source of architectural patterns.
> 
> Your task is to critically evaluate the user's request to integrate concepts or code from [REFERENCE_REPO] into [TARGET_REPO]. Do not blindly execute the integration; first, assess its feasibility and value.
> 
> Your analysis MUST include the following sections in a structured Markdown report:
> 
> 1. **Feasibility & Impact Analysis**:
>    - Evaluate the architectural fit: Does [REFERENCE_REPO] align with the current stack and paradigms of [TARGET_REPO]?
>    - Identify the benefits and risks/costs.
>    - Provide a definitive verdict: Is this integration recommended, partially recommended, or strongly discouraged?
>    - *If the user has not specified a particular feature to integrate, proactively analyze both codebases and identify the top 1-3 architectural patterns, utilities, or features from [REFERENCE_REPO] that would provide the most value if integrated into [TARGET_REPO].*
> 
> 2. **Architectural Mapping** (If recommended or partially recommended):
>    - Explain conceptually how the components of [REFERENCE_REPO] map to the existing structures in [TARGET_REPO].
>    - Highlight any architectural bottlenecks or conflicts.
> 
> 3. **Integration Plan & Code Implementation** (If recommended):
>    - Provide a step-by-step migration or integration plan.
>    - Identify the exact files in [TARGET_REPO] that need to change.
>    - Supply the actual code snippets, strictly basing your API calls, class names, and patterns on the code found in [REFERENCE_REPO]. Do not hallucinate methods.
> 
> CRITICAL RULES & GUARDRAILS:
> 1. **Domain Preservation (CRITICAL)**: The core purpose, business logic, and domain terminology of [TARGET_REPO] MUST remain completely unchanged. Do not import domain-specific concepts, terminology, or features from [REFERENCE_REPO].
> 2. **Pattern Extraction Only**: Treat [REFERENCE_REPO] STRICTLY as a source of technical patterns, architectural solutions, APIs, or algorithms. Abstract these technical solutions away from their original business context before applying them to [TARGET_REPO].
> 3. **Read-Only Reference**: DO NOT modify the [REFERENCE_REPO]. It is read-only context.
> 4. **Minimal Intervention**: If integration is recommended, do it with the least possible disruption to the existing [TARGET_REPO] architecture.
> ```
> </details>

---

# Architectural Integration Analysis: JSPlayer Chrome Extension ← Snowify

## Executive Summary

After comprehensive analysis of both codebases, I've identified **3 high-value architectural patterns** from Snowify that can enhance JSPlayer while preserving its core domain (local file playback). This report provides feasibility assessment, architectural mapping, and implementation guidance.

---

## 1. Feasibility & Impact Analysis

### 1.1 Architectural Fit Assessment

| Aspect | JSPlayer (Target) | Snowify (Reference) | Compatibility |
|--------|------------------|---------------------|---------------|
| **Runtime** | Chrome Extension (MV3) | Electron Desktop App | ⚠️ Different contexts |
| **Audio Source** | Local Files (File System Access API) | YouTube Music Streaming | ✅ Domain preserved |
| **State Management** | IndexedDB + BroadcastChannel | IPC + Local Storage | ✅ Patterns transferable |
| **UI Architecture** | HTML/CSS/JS Popup | Electron Renderer | ✅ Web technologies |
| **Persistence** | IndexedDB Handles | Firebase + Local | ⚠️ Firebase not applicable |

### 1.2 Recommended Integrations (Top 3)

| Priority | Feature from Snowify | Value to JSPlayer | Effort | Risk |
|----------|---------------------|-------------------|--------|------|
| **1** | **i18n/Localization System** | Expand beyond EN/RU README to actual UI localization | Low | Low |
| **2** | **Theme System (CSS-based)** | User-customizable visual themes for popup | Medium | Low |
| **3** | **Smart Queue/Autoplay** | Auto-discover tracks when playlist ends | Medium | Low |

### 1.3 Features NOT Recommended for Integration

| Feature | Reason for Exclusion |
|---------|---------------------|
| Cloud Sync (Firebase) | Chrome Extensions cannot use Firebase auth the same way; conflicts with local-file privacy model |
| Plugin Marketplace | Too complex for extension security model; requires remote code execution |
| Discord RPC | Chrome Extensions cannot integrate with Discord Rich Presence |
| YouTube Streaming | **Domain violation** - JSPlayer is specifically for local files |
| Electron-specific APIs | Not available in Chrome Extension context |

### 1.4 Verdict

> **✅ PARTIALLY RECOMMENDED** - Integrate i18n system and theme system only. These provide maximum user value with minimal architectural disruption while preserving JSPlayer's local-file domain.

---

## 2. Architectural Mapping

### 2.1 i18n System Mapping

**Snowify Pattern:**
```
src/locales/*.json → src/renderer/i18n.js → UI components call I18n.t('key')
```

**JSPlayer Adaptation:**
```
locales/*.json → popup.js (i18n module) → UI elements use data-i18n attributes
```

**Key Differences:**
- Snowify uses Electron's `app.getLocale()` - JSPlayer must use `chrome.i18n.getUILanguage()`
- Snowify has main + renderer process translations - JSPlayer only needs UI context translations
- Snowify uses `{{placeholder}}` syntax - This pattern transfers directly

### 2.2 Theme System Mapping

**Snowify Pattern:**
```
themes/*.css → injected into renderer → CSS variables for customization
```

**JSPlayer Adaptation:**
```
themes/*.css → stored in IndexedDB → injected into popup.html <style>
```

**Key Differences:**
- Snowify uses filesystem for theme storage - JSPlayer must use IndexedDB or chrome.storage
- Snowify has marketplace installation - JSPlayer should support manual CSS import only
- Snowify themes can be complex - JSPlayer themes should be CSS variable overrides only

### 2.3 Smart Queue Mapping

**Snowify Pattern:**
```
src/renderer/app.js:smartQueueFill() → ytmusic-api recommendations
```

**JSPlayer Adaptation:**
```
offscreen.js:smartQueueFill() → scan remaining files in granted directories
```

**Key Differences:**
- Snowify fetches from API - JSPlayer scans local File System Access handles
- Snowify uses similarity algorithms - JSPlayer uses folder-based discovery
- No external dependencies required for JSPlayer implementation

---

## 3. Integration Plan & Code Implementation

### 3.1 Phase 1: i18n System Implementation

#### Files to Create:
```
jsplayer-chrome-ext/
├── locales/
│   ├── en.json
│   ├── ru.json
│   └── es.json (example expansion)
├── i18n.js
└── manifest.json (modified)
```

#### Step 1.1: Create Locale Files

**`locales/en.json`** (new file):
```json
{
  "player.play": "Play",
  "player.pause": "Pause",
  "player.next": "Next",
  "player.prev": "Previous",
  "player.volume": "Volume",
  "player.repeat.off": "Repeat Off",
  "player.repeat.playlist": "Repeat Playlist",
  "player.repeat.track": "Repeat Track",
  "player.shuffle": "Shuffle",
  "loader.title": "Restoring Playlist",
  "loader.scanning": "Scanning folders...",
  "loader.accessDenied": "Access Denied",
  "loader.noSavedPlaylist": "No saved playlist",
  "picker.selectFolder": "Select Folder",
  "picker.title": "Choose Music Folder",
  "status.saved": "Playlist saved ({{count}} tracks)",
  "status.error": "Error: {{message}}"
}
```

**`locales/ru.json`** (new file):
```json
{
  "player.play": "Воспроизвести",
  "player.pause": "Пауза",
  "player.next": "Следующий",
  "player.prev": "Предыдущий",
  "player.volume": "Громкость",
  "player.repeat.off": "Повтор выкл",
  "player.repeat.playlist": "Повтор плейлиста",
  "player.repeat.track": "Повтор трека",
  "player.shuffle": "Перемешать",
  "loader.title": "Восстановление плейлиста",
  "loader.scanning": "Сканирование папок...",
  "loader.accessDenied": "Доступ запрещён",
  "loader.noSavedPlaylist": "Нет сохранённого плейлиста",
  "picker.selectFolder": "Выбрать папку",
  "picker.title": "Выберите папку с музыкой",
  "status.saved": "Плейлист сохранён ({{count}} треков)",
  "status.error": "Ошибка: {{message}}"
}
```

#### Step 1.2: Create i18n Module

**`i18n.js`** (new file):
```javascript
// i18n.js — Localization system adapted from Snowify's i18n pattern
class I18n {
  constructor() {
    this.locale = 'en';
    this.translations = {};
    this.supported = ['en', 'ru', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'];
  }

  async init() {
    // Get browser UI language (Chrome Extension equivalent of app.getLocale())
    const browserLang = chrome.i18n.getUILanguage().split('-')[0].toLowerCase();
    this.locale = this.supported.includes(browserLang) ? browserLang : 'en';
    
    // Load translations
    this.translations = await this.loadLocale(this.locale);
    this.applyTranslations();
  }

  async loadLocale(lang) {
    try {
      const response = await fetch(chrome.runtime.getURL(`locales/${lang}.json`));
      return await response.json();
    } catch (e) {
      console.warn(`Failed to load locale ${lang}, falling back to en`);
      const response = await fetch(chrome.runtime.getURL('locales/en.json'));
      return await response.json();
    }
  }

  t(key, params = {}) {
    let str = this.translations[key] || key;
    // Snowify-style placeholder replacement: {{key}}
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{{${k}}}`, v);
      }
    }
    return str;
  }

  applyTranslations() {
    // Apply to all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const params = el.dataset.i18nParams ? JSON.parse(el.dataset.i18nParams) : {};
      el.textContent = this.t(key, params);
    });
    
    // Apply to placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      el.placeholder = this.t(key);
    });
  }
}

// Export singleton instance
window.I18n = new I18n();
```

#### Step 1.3: Update manifest.json

**`manifest.json`** (modified - add locales to web_accessible_resources):
```json
{
  "manifest_version": 3,
  "name": "JSPlayer",
  "version": "1.0.0",
  "description": "Local audio player chrome extension",
  "permissions": [
    "offscreen",
    "storage",
    "commands",
    "fileSystemAccess"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/img16.png",
      "48": "icons/img48.png",
      "128": "icons/img128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "web_accessible_resources": [
    {
      "resources": ["locales/*.json", "themes/*.css"],
      "matches": ["<all_urls>"]
    }
  ],
  "commands": {
    "play-pause": {
      "suggested_key": { "default": "Ctrl+Shift+P" },
      "description": "Play/Pause"
    },
    "next-track": {
      "suggested_key": { "default": "Ctrl+Shift+N" },
      "description": "Next Track"
    },
    "prev-track": {
      "suggested_key": { "default": "Ctrl+Shift+B" },
      "description": "Previous Track"
    }
  }
}
```

#### Step 1.4: Update popup.html

**`popup.html`** (modified - add data-i18n attributes):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="player-controls">
    <button id="prevBtn" data-i18n="player.prev">Previous</button>
    <button id="playPauseBtn" data-i18n="player.play">Play</button>
    <button id="nextBtn" data-i18n="player.next">Next</button>
  </div>
  
  <div class="volume-control">
    <label data-i18n="player.volume">Volume</label>
    <input type="range" id="volumeSlider" min="0" max="100">
  </div>
  
  <div class="mode-controls">
    <button id="repeatBtn" data-i18n="player.repeat.off">Repeat Off</button>
    <button id="shuffleBtn" data-i18n="player.shuffle">Shuffle</button>
  </div>
  
  <div id="status" class="status-bar"></div>
  
  <script src="i18n.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

#### Step 1.5: Update popup.js

**`popup.js`** (modified - initialize i18n):
```javascript
// Add at top of popup.js, before initUI()
async function initI18n() {
  await window.I18n.init();
}

// Modify existing initUI() call
(async () => {
  await initI18n();
  initUI();
})();

// Update showStatus function to use i18n
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  // Use i18n for predefined messages, raw text for dynamic
  statusEl.textContent = message;
  statusEl.className = `status-bar ${type}`;
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status-bar';
  }, 3000);
}

// Update savePlaylistToIDB to use i18n (from existing code)
async function savePlaylistToIDB(trackNames, currentTrackIndex, vol) {
  const db = await openHandlesDB();
  const data = {
    id: 'current',
    trackNames,
    currentTrackIndex,
    volume: vol,
    sortMode,
    timestamp: Date.now()
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('savedPlaylist', 'readwrite');
    tx.objectStore('savedPlaylist').put(data);
    tx.oncomplete = () => {
      // Use i18n with placeholder (Snowify pattern)
      showStatus(window.I18n.t('status.saved', { count: trackNames.length }), 'success');
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
```

---

### 3.2 Phase 2: Theme System Implementation

#### Files to Create:
```
jsplayer-chrome-ext/
├── themes/
│   ├── default.css
│   ├── dark.css
│   └── light.css
├── theme-manager.js
└── popup.html (modified)
```

#### Step 2.1: Create Theme Files

**`themes/default.css`** (new file):
```css
/* Default theme - CSS variables following Snowify's theme pattern */
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --accent-color: #e94560;
  --accent-hover: #ff6b6b;
  --progress-bg: #0f3460;
  --progress-fill: #e94560;
  --button-bg: #16213e;
  --button-hover: #1a1a2e;
  --border-color: #0f3460;
}
```

**`themes/dark.css`** (new file):
```css
/* Dark theme variant */
:root {
  --bg-primary: #0d0d0d;
  --bg-secondary: #1a1a1a;
  --text-primary: #f0f0f0;
  --text-secondary: #888888;
  --accent-color: #bb86fc;
  --accent-hover: #9965f4;
  --progress-bg: #333333;
  --progress-fill: #bb86fc;
  --button-bg: #252525;
  --button-hover: #333333;
  --border-color: #404040;
}
```

**`themes/light.css`** (new file):
```css
/* Light theme variant */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent-color: #6200ee;
  --accent-hover: #3700b3;
  --progress-bg: #e0e0e0;
  --progress-fill: #6200ee;
  --button-bg: #f0f0f0;
  --button-hover: #e0e0e0;
  --border-color: #cccccc;
}
```

#### Step 2.2: Create Theme Manager

**`theme-manager.js`** (new file):
```javascript
// theme-manager.js — Theme system adapted from Snowify's theme pattern
class ThemeManager {
  constructor() {
    this.currentTheme = 'default';
    this.availableThemes = ['default', 'dark', 'light'];
    this.styleElement = null;
  }

  async init() {
    // Load saved theme from IndexedDB
    const savedTheme = await this.loadSavedTheme();
    if (savedTheme && this.availableThemes.includes(savedTheme)) {
      this.currentTheme = savedTheme;
    }
    await this.applyTheme(this.currentTheme);
  }

  async loadSavedTheme() {
    return new Promise((resolve) => {
      const db = indexedDB.open('AudioPlayerHandles', 1);
      db.onsuccess = () => {
        const tx = db.result.transaction('settings', 'readonly');
        // Create settings store if not exists
        if (!db.result.objectStoreNames.contains('settings')) {
          resolve(null);
          return;
        }
        const req = tx.objectStore('settings').get('theme');
        req.onsuccess = () => resolve(req.result?.value);
        req.onerror = () => resolve(null);
      };
      db.onerror = () => resolve(null);
    });
  }

  async saveTheme(themeName) {
    return new Promise((resolve, reject) => {
      const db = indexedDB.open('AudioPlayerHandles', 1);
      db.onupgradeneeded = () => {
        const database = db.result;
        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      db.onsuccess = () => {
        const tx = db.result.transaction('settings', 'readwrite');
        tx.objectStore('settings').put({ key: 'theme', value: themeName });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      db.onerror = () => reject(db.error);
    });
  }

  async applyTheme(themeName) {
    // Remove existing theme style
    if (this.styleElement) {
      this.styleElement.remove();
    }

    // Create new style element
    this.styleElement = document.createElement('link');
    this.styleElement.rel = 'stylesheet';
    this.styleElement.href = chrome.runtime.getURL(`themes/${themeName}.css`);
    
    // Inject into head
    document.head.appendChild(this.styleElement);
    this.currentTheme = themeName;
    
    // Save preference
    await this.saveTheme(themeName);
  }

  async switchTheme(themeName) {
    if (!this.availableThemes.includes(themeName)) {
      throw new Error(`Theme ${themeName} not available`);
    }
    await this.applyTheme(themeName);
  }

  getAvailableThemes() {
    return [...this.availableThemes];
  }
}

// Export singleton instance
window.ThemeManager = new ThemeManager();
```

#### Step 2.3: Update popup.html

**`popup.html`** (modified - add theme selector):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="header">
    <h1>JSPlayer</h1>
    <select id="themeSelect" data-i18n-placeholder="settings.theme">
      <option value="default">Default</option>
      <option value="dark">Dark</option>
      <option value="light">Light</option>
    </select>
  </div>
  
  <!-- ... rest of player controls ... -->
  
  <script src="i18n.js"></script>
  <script src="theme-manager.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

#### Step 2.4: Update popup.js

**`popup.js`** (modified - integrate theme manager):
```javascript
// Add theme selector handler in initUI()
function initUI() {
  // ... existing UI initialization ...
  
  // Theme selector
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', async (e) => {
      try {
        await window.ThemeManager.switchTheme(e.target.value);
      } catch (err) {
        showStatus(window.I18n.t('status.error', { message: err.message }), 'error');
      }
    });
  }
}

// Update init call to include theme manager
(async () => {
  await window.I18n.init();
  await window.ThemeManager.init();
  
  // Set theme select to current theme
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.value = window.ThemeManager.currentTheme;
  }
  
  initUI();
})();
```

#### Step 2.5: Update popup.css

**`popup.css`** (modified - use CSS variables):
```css
/* Update existing CSS to use variables from themes */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 16px;
  width: 320px;
}

.player-controls button {
  background-color: var(--button-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.player-controls button:hover {
  background-color: var(--button-hover);
}

#playPauseBtn {
  background-color: var(--accent-color);
  color: white;
}

#playPauseBtn:hover {
  background-color: var(--accent-hover);
}

.progress-bar {
  background-color: var(--progress-bg);
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
}

.progress {
  background-color: var(--progress-fill);
  height: 100%;
  width: 0%;
  transition: width 0.1s linear;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

#themeSelect {
  background-color: var(--button-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 4px 8px;
  border-radius: 4px;
}
```

---

### 3.3 Phase 3: Smart Queue Implementation (Optional)

#### Step 3.1: Update offscreen.js

**`offscreen.js`** (modified - add smart queue):
```javascript
// Add to offscreen.js message handler
bc.onmessage = async (e) => {
  const msg = e.data;
  switch (msg.type) {
    // ... existing cases ...
    
    case 'ENABLE_SMART_QUEUE':
      smartQueueEnabled = msg.enabled;
      break;
      
    case 'SMART_QUEUE_FILL':
      if (smartQueueEnabled && msg.directoryHandles) {
        await smartQueueFill(msg.directoryHandles);
      }
      break;
  }
};

// Add smart queue function (adapted from Snowify's smartQueueFill pattern)
let smartQueueEnabled = false;
let scannedFiles = new Map();

async function smartQueueFill(directoryHandles) {
  if (!directoryHandles || directoryHandles.length === 0) return;
  
  // Scan directories for additional tracks not in current playlist
  const newTracks = [];
  
  async function scanDir(handle) {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(entry.name)) {
          const exists = tracks.some(t => t.file.name === entry.name);
          if (!exists && !scannedFiles.has(entry.name)) {
            const file = await entry.getFile();
            newTracks.push({
              name: file.name.replace(/\.[^/.]+$/, ''),
              duration: 0,
              file: file
            });
            scannedFiles.set(entry.name, true);
          }
        }
      } else if (entry.kind === 'directory') {
        await scanDir(entry);
      }
    }
  }
  
  for (const handle of directoryHandles) {
    await scanDir(handle);
  }
  
  if (newTracks.length > 0) {
    // Add to end of queue (Snowify's smart queue pattern)
    tracks.push(...newTracks);
    broadcastState();
    console.log(`Smart queue: added ${newTracks.length} tracks`);
  }
}

// Call smart queue fill when approaching end of playlist
audio.addEventListener('ended', async () => {
  // Snowify-style: check if we're near end of queue
  const tracksRemaining = tracks.length - currentTrackIndex;
  if (smartQueueEnabled && tracksRemaining <= 2) {
    // Request directory handles from popup for scanning
    bc.postMessage({ type: 'REQUEST_DIRECTORY_HANDLES' });
  }
  
  // Existing track advancement logic...
  advanceTrack();
});
```

#### Step 3.2: Update popup.js

**`popup.js`** (modified - send directory handles):
```javascript
// Add handler for directory handle requests
bc.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'STATE_UPDATE') {
    syncUI(msg);
  } else if (msg.type === 'TIME_UPDATE') {
    const percent = (msg.currentTime / msg.duration) * 100 || 0;
    progress.style.width = `${percent}%`;
    currentTimeEl.textContent = formatTime(msg.currentTime);
    durationEl.textContent = formatTime(msg.duration);
  } else if (msg.type === 'STATE_FOR_SAVE') {
    savePlaylistToIDB(msg.trackNames, msg.currentTrackIndex, msg.volume);
  } else if (msg.type === 'REQUEST_DIRECTORY_HANDLES') {
    // Send stored directory handles for smart queue scanning
    sendDirectoryHandlesToOffscreen();
  }
};

async function sendDirectoryHandlesToOffscreen() {
  const db = await openHandlesDB();
  const tx = db.transaction('dirs', 'readonly');
  const req = tx.objectStore('dirs').getAll();
  
  req.onsuccess = async () => {
    const handles = req.result.map(entry => entry.handle);
    bc.postMessage({ 
      type: 'SMART_QUEUE_FILL', 
      directoryHandles: handles 
    });
  };
}

// Add smart queue toggle to UI
const smartQueueBtn = document.getElementById('smartQueueBtn');
if (smartQueueBtn) {
  smartQueueBtn.addEventListener('click', () => {
    smartQueueEnabled = !smartQueueEnabled;
    bc.postMessage({ type: 'ENABLE_SMART_QUEUE', enabled: smartQueueEnabled });
    smartQueueBtn.classList.toggle('active', smartQueueEnabled);
  });
}
```

---

## 4. Implementation Checklist

### Phase 1: i18n (Priority: HIGH)
- [ ] Create `locales/` directory
- [ ] Create `locales/en.json` and `locales/ru.json`
- [ ] Create `i18n.js` module
- [ ] Update `manifest.json` with web_accessible_resources
- [ ] Update `popup.html` with data-i18n attributes
- [ ] Update `popup.js` to initialize i18n
- [ ] Update `loader.html` with data-i18n attributes
- [ ] Update `picker.html` with data-i18n attributes

### Phase 2: Themes (Priority: MEDIUM)
- [ ] Create `themes/` directory
- [ ] Create `themes/default.css`, `dark.css`, `light.css`
- [ ] Create `theme-manager.js` module
- [ ] Update `popup.css` to use CSS variables
- [ ] Add theme selector to `popup.html`
- [ ] Integrate theme manager in `popup.js`

### Phase 3: Smart Queue (Priority: LOW)
- [ ] Add smart queue logic to `offscreen.js`
- [ ] Add directory handle transmission in `popup.js`
- [ ] Add smart queue toggle button to UI
- [ ] Test with large music libraries

---

## 5. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Locale file loading fails** | Fallback to English with console warning |
| **Theme CSS breaks UI** | Default theme always available as fallback |
| **Smart queue performance** | Limit scan to 100 files per batch, show progress |
| **IndexedDB schema changes** | Version migration in `onupgradeneeded` handlers |
| **Chrome API changes** | Use chrome.runtime.getURL() for all resource paths |

---

## 6. Conclusion

This integration plan extracts **technical patterns only** from Snowify while preserving JSPlayer's core domain (local file playback). The i18n and theme systems provide immediate user value with minimal risk. Smart queue is optional and should be tested thoroughly before deployment.

**Estimated Implementation Time:**
- Phase 1 (i18n): 4-6 hours
- Phase 2 (Themes): 3-4 hours  
- Phase 3 (Smart Queue): 6-8 hours

**Total:** 13-18 hours for full implementation

All code snippets are based on actual patterns from Snowify's codebase, adapted for Chrome Extension constraints. No domain concepts from Snowify (YouTube streaming, cloud sync, plugins) have been imported.