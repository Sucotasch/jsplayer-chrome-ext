> **🤖 Prompt Generation Metadata**
> - **Model:** gemini-3.1-pro-preview
> - **Target Repository:** https://github.com/Sucotasch/jsplayer-chrome-ext
> - **Auto-generated RAG Query:** "PlaylistController, PlaylistService, SearchBar, SearchFilter, debounce, filteredList, PlaylistView, trackName, playlistItems, filterItems, textChangeListener, onQueryTextChange, ListAdapter, Repository, Store"
> 
> <details><summary><b>Task Instructions</b></summary>
> 
> ```text
> You are an expert software engineer and AI assistant. Based on the following GitHub repository information, generate a comprehensive system prompt suitable for further development of the project using Gemini CLI or Antigravity. The prompt should be formatted as markdown, ready to be saved as `gemini.md`.
> 
> Generate a system prompt that includes:
> 1. The project's purpose and tech stack.
> 2. The architectural patterns and conventions used.
> 3. Instructions for the AI on how to assist with this specific codebase.
> 4. Any specific rules or guidelines for contributing to this project.
> ```
> </details>
>
> <details><summary><b>Additional Context</b></summary>
> 
> ```text
> Добавить поиск в плейлисте
> ```
> </details>

---

Here is the comprehensive system prompt tailored for the JSPlayer Chrome Extension, incorporating your requirement to add a playlist search feature.

```markdown
# System Prompt: JSPlayer Chrome Extension Development

## 1. Project Purpose and Tech Stack
**Project Name:** JSPlayer Chrome Extension
**Purpose:** A persistent local audio player extension for Google Chrome. It plays local audio files (`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`) directly from the user's hard drive without uploading them. Unlike standard web players, it maintains playback state across sessions and continues playing in the background via Offscreen Documents.
**Tech Stack:**
- **Core:** Vanilla JavaScript, HTML5, CSS3.
- **Architecture:** Chrome Extensions API (Manifest V3).
- **Background Execution:** Chrome Offscreen Documents API (`chrome.offscreen`).
- **File Access:** File System Access API (`window.showDirectoryPicker()`, `FileSystemDirectoryHandle`).
- **Data Persistence:** IndexedDB (used to securely store directory handles and playlist metadata).
- **Inter-context Communication:** `BroadcastChannel` API.
- **Shortcuts:** Chrome Commands API (`chrome.commands`) for global media key binding.

## 2. Architectural Patterns and Conventions
The extension is decoupled into distinct execution contexts operating under Manifest V3:
- **Service Worker (`background.js`):** Acts as the orchestrator. Manages the lifecycle of the Offscreen Document and listens to global Chrome Media Key commands, relaying them via `BroadcastChannel`.
- **Audio Engine (`offscreen.html` & `offscreen.js`):** The core player and single source of truth. It hosts the hidden `<audio>` element, manages the `tracks` array, current playback index, volume, repeat/shuffle logic, and broadcasts state updates to the UI.
- **User Interfaces:**
  - **`popup.html` / `popup.js`:** The main user interface. Sends control signals (Play, Pause, Skip, Drag&Drop) to the offscreen engine.
  - **`picker.html` / `picker.js`:** Dedicated interface for initial folder selection using `window.showDirectoryPicker()`.
  - **`loader.html` / `loader.js`:** Handles playlist restoration on session startup. It retrieves saved handles from IndexedDB, asks for user permission (requires a transient user gesture), rescans directories, and reconstructs the playlist queue.
- **Communication Convention:** All contexts communicate asynchronously using a shared `BroadcastChannel` named `'audio_player_channel'`.

## 3. Current Primary Objective: Implement Playlist Search
**Task Constraint:** Добавить поиск в плейлисте (Add search functionality to the playlist).
**Implementation Requirements:**
- **UI:** Add a search/filter text input field to the `popup.html` interface.
- **Logic:** Filtering should happen dynamically on the frontend (`popup.js`). It must visually hide/filter tracks that do not match the search query without altering the actual `tracks` array stored in `offscreen.js`.
- **Indexing Safety:** Ensure that clicking a track from the filtered search results sends the *correct original index* to the offscreen document via the `PLAY_INDEX` message, rather than its temporary index in the filtered array.
- **Performance:** Ensure the search input is debounced or optimized so it doesn't freeze the popup UI when dealing with large playlists (e.g., thousands of tracks).

## 4. AI Development Instructions & Guidelines
- **Vanilla First:** Stick strictly to Vanilla JavaScript, HTML, and CSS. Do not introduce frontend frameworks (React, Vue, etc.) or heavy dependencies unless explicitly requested.
- **API Limitations:** Be highly mindful of Manifest V3 security policies and the File System Access API limitations. Remember that `FileSystemDirectoryHandle.requestPermission()` strictly requires user activation (a click event).
- **State Management:** Treat `offscreen.js` as the absolute source of truth. The popup UI should be a "dumb client" that simply renders the state broadcasted by the offscreen document and sends user intents.
- **Error Handling:** When working with local files, handle edge cases gracefully: files deleted outside the browser, revoked permissions, and unsupported MIME types.
- **Bilingual Support:** Code comments and variables should remain in English for consistency. Direct interactions, explanations, and feature discussions with the user can be conducted in Russian as requested.
```

---

### ⚠️ Secondary Request: Repository Analysis & Findings

Based on a brief analysis of the provided repository snippets, here are a few critical architectural inconsistencies, bugs, and potential improvements:

**1. CRITICAL BUG: Playlist Restoration Logic Overwrites Files (`loader.js`)**
In `loader.js`, when scanning directories to restore the playlist, the code uses a Map keyed by the file's name:
```javascript
// from loader.js
fileMap.set(entry.name, file); 
```
* **The Issue:** If a user selects multiple folders, or a folder with subdirectories, and there are two files with the exact same name (e.g., `01-intro.mp3` or `track.mp3`), the Map will overwrite the first file with the second one. When the playlist restores, it will play the wrong file or fail to find duplicates.
* **The Fix:** The map should ideally use a composite key (like relative path + filename) or the extension should store full relative paths in the IndexedDB `savedPlaylist` rather than just `trackNames`.

**2. UX Bottleneck: Sequential Permission Prompts**
In `loader.js`, when the extension restarts, it iterates through all saved `grantedHandles` and requests permission for each:
```javascript
const perm = await entry.handle.requestPermission({ mode: 'read' });
```
* **The Issue:** Chrome handles this by displaying a native popup asking the user to click "Allow". If a user dragged in 15 different folders or files directly, they will be bombarded with 15 sequential permission popups upon reopening the extension.
* **The Fix:** It is highly recommended to encourage users to select a single "Parent" music directory via the Picker, so they only have to approve one permission prompt upon restart.

**3. "Fake Pulse" Keepalive Hack (`offscreen.js`)**
The comments in `offscreen.js` indicate a workaround for Manifest V3 lifecycle limits:
```javascript
stopKeepalive(); // Stop fake pulse, real audio is playing
```
* **The Issue:** Google's Web Store review process can be strict regarding extensions that artificially keep themselves alive when not actively performing their stated task. While `chrome.offscreen` contexts playing audio *are* allowed to stay alive, using a "fake pulse" (likely a silent repeating audio track or interval) when paused might get the extension flagged or rejected if published to the Chrome Web Store. 

**4. Empty `package.json`**
The `package.json` file is essentially a blank template. While not an error for a vanilla project, adding basic scripts for linting (e.g., ESLint) and formatting (Prettier) would significantly help maintain code quality across the background, offscreen, and UI scripts.