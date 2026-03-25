> **🤖 Prompt Generation Metadata**
> - **Model:** qwen3.5-plus
> - **Target Repository:** https://github.com/Sucotasch/jsplayer-chrome-ext
> - **Auto-generated RAG Query:** "core logic, architecture, main components, tech stack, dependencies

Specific Task Context: Добавить поиск в плейлисте"
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

# JSPlayer Chrome Extension — AI Development System Prompt

```markdown
# JSPlayer Chrome Extension — AI Development Guide

## 🎯 Project Purpose

**JSPlayer** is a Manifest V3 Chrome Extension that functions as a persistent local audio player. It enables users to play audio files directly from their hard drive with background playback capability, playlist persistence across browser sessions, and media key support.

### Core Value Proposition
- Play local audio files without uploading to servers
- Maintain playback state across browser restarts
- Background playback via Offscreen Documents
- Secure folder access via File System Access API

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| **Platform** | Google Chrome Extension (Manifest V3) |
| **Storage** | IndexedDB (for handles & playlist metadata) |
| **Communication** | BroadcastChannel API (inter-context messaging) |
| **Audio Engine** | HTML5 `<audio>` element in Offscreen Document |
| **File Access** | File System Access API (`showDirectoryPicker`, `requestPermission`) |
| **Background Process** | Service Worker (`background.js`) |
| **UI Framework** | Vanilla JavaScript + HTML + CSS (no frameworks) |

### Supported Audio Formats
`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`

---

## 🏗 Architecture Patterns

### 1. Three-Context Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Popup     │  │   Loader    │  │      Picker         │  │
│  │  (UI Main)  │  │ (Restore)   │  │  (Folder Select)    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                      │            │
│         └────────────────┼──────────────────────┘            │
│                          │                                   │
│              BroadcastChannel ('audio_player_channel')       │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │              Offscreen Document                        │  │
│  │         (Audio Engine + State Management)              │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │              Service Worker                            │  │
│  │         (Media Keys + Offscreen Lifecycle)             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Communication Pattern

All contexts communicate via **BroadcastChannel** named `'audio_player_channel'`:

```javascript
// Sending
bc.postMessage({ type: 'PLAY', index: 0 });

// Receiving
bc.onmessage = (e) => {
    const { type, payload } = e.data;
    // Handle message
};
```

### 3. Message Types Reference

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `ADD_FILES` | UI → Offscreen | Add new tracks to playlist |
| `PLAY_INDEX` | UI → Offscreen | Play specific track |
| `TOGGLE_PLAY` | UI/Background → Offscreen | Play/Pause toggle |
| `NEXT` / `PREV` | UI/Background → Offscreen | Track navigation |
| `GET_STATE` | UI → Offscreen | Request current player state |
| `STATE_UPDATE` | Offscreen → UI | Broadcast state changes |
| `CLEAR` | UI → Offscreen | Clear playlist |
| `SET_REPEAT` / `SET_SHUFFLE` | UI → Offscreen | Playback modes |
| `GET_STATE_FOR_SAVE` | UI → Offscreen | Get state for persistence |
| `SETUP_OFFSCREEN` | UI → Background | Initialize offscreen document |

### 4. Data Persistence (IndexedDB)

```javascript
// Database: 'AudioPlayerHandles'
// Stores:
// - 'dirs': FileSystemDirectoryHandle objects with metadata
// - 'savedPlaylist': Track names array + current index + volume
```

---

## 🤖 AI Assistant Instructions

### How to Assist with This Codebase

1. **Understand Context Boundaries**
   - Service Worker cannot access DOM
   - Offscreen Document has DOM but is hidden
   - Popup/Loader/Picker have visible UI but limited lifetime
   - Never mix context-specific APIs across boundaries

2. **When Adding Features**
   - Identify which context should own the feature
   - Use BroadcastChannel for cross-context communication
   - Maintain existing message type conventions
   - Update all affected contexts (UI + Offscreen + Background if needed)

3. **When Modifying Audio Logic**
   - All audio state lives in `offscreen.js`
   - Always broadcast state changes after mutations
   - Handle URL object cleanup (`URL.revokeObjectURL`)

4. **When Working with File System**
   - Permissions require user gesture (click event)
   - Handles are stored in IndexedDB for persistence
   - Always check permission status before accessing files

5. **When Adding UI Features**
   - Popup has limited lifetime (closes on blur)
   - Loader/Picker are full windows for permission flows
   - Keep UI responsive during file scanning operations

### Code Style Conventions

```javascript
// ✅ DO: Use async/await for async operations
async function loadPlaylist() {
    const db = await openHandlesDB();
    // ...
}

// ✅ DO: Use BroadcastChannel for cross-context communication
const bc = new BroadcastChannel('audio_player_channel');
bc.postMessage({ type: 'PLAY_INDEX', index: 0 });

// ✅ DO: Clean up Object URLs
URL.revokeObjectURL(currentObjectUrl);

// ✅ DO: Handle errors gracefully
try {
    // operation
} catch (err) {
    console.error(err);
    // user feedback
}

// ❌ DON'T: Mix context APIs
// (e.g., don't call chrome.offscreen in popup directly)

// ❌ DON'T: Forget to broadcast state changes
// (UI will become out of sync)
```

---

## 📋 Contribution Guidelines

### Feature Implementation Checklist

- [ ] Identify target context(s) for the feature
- [ ] Define new message types if cross-context communication needed
- [ ] Update all affected files
- [ ] Test in all contexts (Popup, Loader, Offscreen)
- [ ] Verify no memory leaks (URL objects, event listeners)
- [ ] Test persistence across browser restarts

### File Organization

| File | Purpose | Edit When |
|------|---------|-----------|
| `manifest.json` | Extension config | Adding permissions, commands, or entry points |
| `background.js` | Service Worker | Media keys, offscreen lifecycle |
| `offscreen.js` | Audio Engine | Playback logic, state management |
| `popup.js` | Main UI | Controls, playlist display, drag-drop |
| `loader.js` | Restoration | Playlist restore logic |
| `picker.js` | Folder Select | Initial folder selection |

### Testing Requirements

1. **Functional Tests**
   - Play/Pause/Next/Prev work correctly
   - Media keys trigger correct actions
   - Playlist persists across browser restarts
   - Folder permissions are requested correctly

2. **Edge Cases**
   - Empty playlist handling
   - Missing files during restoration
   - Permission denied scenarios
   - Large playlists (100+ tracks)

---

## 🔧 Current Development Priority

### User Request: Add Playlist Search

**Requirement:** Implement search functionality to filter tracks in the playlist view.

**Implementation Guidelines:**
1. Add search input to `popup.html`
2. Implement filter logic in `popup.js`
3. Search should filter displayed tracks without modifying the actual playlist
4. Search should be case-insensitive
5. Consider searching by: track name, file name
6. Maintain playback state during search

**Suggested Approach:**
```javascript
// In popup.js
let searchQuery = '';
let filteredTracks = [];

function filterTracks(query) {
    searchQuery = query.toLowerCase();
    filteredTracks = allTracks.filter(track => 
        track.name.toLowerCase().includes(searchQuery)
    );
    renderPlaylist(filteredTracks);
}
```

---

## ⚠️ Known Limitations

1. **Folder Access:** Not permanent; requires re-granting after browser restart
2. **File Moves:** Renamed/moved files appear as "Missing" during restoration
3. **Desktop Only:** Does not work on Chrome for Android/iOS
4. **Popup Lifetime:** Popup closes on blur; long operations should use Loader
5. **Memory:** Large playlists may consume significant memory (file handles + Object URLs)

---

## 📚 Key API References

- [Chrome Offscreen API](https://developer.chrome.com/docs/extensions/reference/offscreen/)
- [File System Access API](https://developer.chrome.com/docs/capabilities/file-access)
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
```

---

# 🔍 Repository Analysis: Issues & Recommendations

After analyzing the codebase, I've identified the following concerns:

## 🐛 Critical Issues

| # | Issue | Severity | Location | Recommendation |
|---|-------|----------|----------|----------------|
| 1 | **URL Object Leak Risk** | High | `offscreen.js` | `URL.revokeObjectURL` is called but only for `currentObjectUrl`. Previous URLs may leak if `playCurrent()` is called rapidly. Add cleanup for all created URLs. |
| 2 | **BroadcastChannel Not Closed** | Medium | All contexts | No `bc.close()` calls found. Channels should be closed when contexts unload to prevent memory leaks. |
| 3 | **Shuffle Index Bug** | Medium | `offscreen.js` (Part 9) | After shuffle, `currentTrackIndex = tracks.indexOf(cur)` may return `-1` if object reference changes. Store track ID instead of relying on object reference. |
| 4 | **No Volume Persistence Load** | Medium | `loader.js` | Volume is saved in `GET_STATE_FOR_SAVE` but never restored during playlist loading. Add volume restoration logic. |
| 5 | **Auto-Close on Errors** | Low | `loader.js` | Window closes automatically on errors (2-4 seconds). User may not see error message. Add manual close button. |

## 🏗 Architectural Inconsistencies

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| 1 | **Inconsistent Message Structure** | All contexts | Some messages use `{type, payload}`, others use `{type, ...data}`. Standardize message format. |
| 2 | **No Track IDs** | `offscreen.js` | Tracks identified by filename only. Add unique IDs for reliable tracking during shuffle/reorder. |
| 3 | **Hardcoded Channel Name** | Multiple files | `'audio_player_channel'` is hardcoded in multiple places. Create a constants file. |
| 4 | **No Loading States in Popup** | `popup.js` | No visual feedback during file scanning or state sync. Add loading indicators. |

## 📦 Dependency Concerns

| # | Issue | Details |
|---|-------|---------|
| 1 | **Empty package.json** | No dependencies defined, no build scripts. Consider adding linting (ESLint) and formatting (Prettier). |
| 2 | **No TypeScript** | Pure JavaScript increases risk of type-related bugs. Consider migrating to TypeScript for better IDE support. |
| 3 | **No Test Suite** | No testing framework configured. Add Jest or similar for unit tests. |

## 🔐 Security Considerations

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | **File Handle Storage** | Storing `FileSystemDirectoryHandle` in IndexedDB is correct, but ensure handles are validated on each use. |
| 2 | **Permission Scope** | Currently requests `read` mode only. Ensure this is sufficient and don't request `write` unnecessarily. |
| 3 | **Content Security Policy** | Verify `manifest.json` has strict CSP to prevent XSS in popup/offscreen contexts. |

## ✅ Quick Wins for Improvement

1. Add `bc.close()` in cleanup handlers for all contexts
2. Add volume restoration in `loader.js`
3. Add unique track IDs for reliable shuffle/reorder
4. Create `constants.js` for shared values (channel name, file extensions)
5. Add ESLint + Prettier configuration
6. Implement the requested **playlist search feature** (see system prompt above)

---

*Generated for JSPlayer Chrome Extension development assistance*