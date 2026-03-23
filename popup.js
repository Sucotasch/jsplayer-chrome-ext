
window.onerror = function(msg, url, lineNo, columnNo, error) {
    const sb = document.getElementById('statusBar') || document.getElementById('statusMsg');
    if (sb) {
        sb.textContent = 'ERR: ' + msg + ' @ LINE ' + lineNo;
        sb.className = 'status-bar show error';
        sb.style.display = 'block';
        sb.style.color = 'red';
        sb.style.background = '#ffdada';
    }
    return false;
};

// popup.js
const player = document.getElementById('player');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const volume = document.getElementById('volume');
const addMenuBtn = document.getElementById('addMenuBtn');
const addMenu = document.getElementById('addMenu'); // This seems to be replaced by addMenuContent in the snippet, but keeping for now
const addFilesOpt = document.getElementById('addFilesOpt');
const addFolderOpt = document.getElementById('addFolderOpt');
const includeSubfolders = document.getElementById('includeSubfolders');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const playlistEl = document.getElementById('playlist');
const playlistCount = document.getElementById('playlistCount');
const statusBar = document.getElementById('statusBar'); // Renamed to statusMsg in snippet, but keeping original for now
const sortBtn = document.getElementById('sortBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const loadPlaylistBtn = document.getElementById('loadPlaylistBtn');
const savePlaylistBtn = document.getElementById('savePlaylistBtn');
const audioFile = document.getElementById('audioFile');

// New UI Elements from snippet
const progressContainer = document.querySelector('.progress-container'); // Added based on snippet
const addMenuContent = document.getElementById('addMenuContent'); // Assuming this replaces 'addMenu' for content
const filesInput = document.getElementById('filesInput'); // Assuming this replaces 'audioFile' for input
const addFolderOption = document.getElementById('addFolderOption'); // Assuming this replaces 'addFolderOpt'
const repeatBtn = document.getElementById('repeatBtn');
const mainSettingsBtn = document.getElementById('mainSettingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const statusMsg = document.getElementById('statusBar'); // Assuming statusBar is now statusMsg

// State
let localTracksCount = 0;
let sortMode = 'default';
let isPlaying = false; // Added based on snippet
let currentDuration = 0; // Added based on snippet
let repeatMode = localStorage.getItem('audioPlayerRepeat') || 'playlist'; // playlist, track, off
let isDarkTheme = localStorage.getItem('audioPlayerTheme') === 'dark';

// -- BROADCAST CHANNEL COMM --
const bc = new BroadcastChannel('audio_player_channel');

// ── Initialization ───────────────────────────────────────────────
function initUI() {
    bc.postMessage({ type: 'GET_STATE' });
    
    // Apply theme
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        toggleThemeBtn.textContent = '🌙 Dark Theme: On';
    } else {
        toggleThemeBtn.textContent = '🌙 Dark Theme: Off';
    }
    
    // Apply repeat icon
    updateRepeatIcon();
    bc.postMessage({ type: 'SET_REPEAT', mode: repeatMode });
}
initUI();

function updateRepeatIcon() {
    if (repeatMode === 'playlist') repeatBtn.textContent = '🔁';
    else if (repeatMode === 'track') repeatBtn.textContent = '🔂';
    else if (repeatMode === 'off') repeatBtn.textContent = '➡';
}

// Wake up the background to ensure offscreen is created
chrome.runtime.sendMessage({ type: 'SETUP_OFFSCREEN' }, () => {
    // Request current state from offscreen
    bc.postMessage({ type: 'GET_STATE' });
});

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
    }
};

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function showStatus(message, type = 'info') {
    statusMsg.textContent = message;
    statusMsg.className = 'status-bar show ' + type;
    setTimeout(() => {
        statusMsg.className = 'status-bar';
    }, 3000);
}

function syncUI({ tracks, currentTrackIndex, isPlaying: newIsPlaying, volume: rawVolume }) { // Renamed isPlaying to newIsPlaying to avoid conflict with global state
    isPlaying = newIsPlaying; // Update global isPlaying state
    localTracksCount = tracks.length;
    playlistCount.textContent = tracks.length;
    
    if (tracks.length === 0) {
        title.textContent = 'Select files';
        artist.textContent = 'AudioPlayer Pro';
        playBtn.textContent = '▶';
        player.classList.remove('playing');
        progress.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';
        playlistEl.innerHTML = '';
        return;
    }

    // Sync volume slider without triggering events
    if (document.activeElement !== volume) {
        volume.value = rawVolume;
    }

    if (isPlaying) {
        playBtn.textContent = '⏸';
        player.classList.add('playing');
    } else {
        playBtn.textContent = '▶';
        player.classList.remove('playing');
    }

    const currentTrack = tracks[currentTrackIndex];
    if (currentTrack) {
        title.textContent = currentTrack.name;
        artist.textContent = `Track ${currentTrackIndex + 1} of ${tracks.length}`;
    }

    renderPlaylist(tracks, currentTrackIndex);
}

// -- NATIVE HTML FILE PICKING & DRAG-N-DROP --

addFolderOption?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addMenuContent.style.display = 'none';
    
    // Open picker window to safely bypass Chromium OS-modal deadlocks in popup
    chrome.windows.create({
        url: chrome.runtime.getURL('picker.html'),
        type: 'popup',
        width: 480,
        height: 380,
        focused: true
    });
});

filesInput?.addEventListener('change', handleFileSelect);

// Global Drag and Drop for Folders
document.body?.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.classList.add('drag-active');
});
document.body?.addEventListener('dragleave', (e) => {
    if (e.target === document.body) {
        document.body.classList.remove('drag-active');
    }
});
document.body?.addEventListener('drop', async (e) => {
    e.preventDefault();
    document.body.classList.remove('drag-active');
    
    if (!e.dataTransfer || !e.dataTransfer.items) return;
    showStatus('Scanning files...', 'info');
    
    const items = e.dataTransfer.items;
    const validFiles = [];
    
    async function readEntry(entry) {
        if (entry.isFile) {
            const file = await new Promise(r => entry.file(r));
            if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name)) {
                validFiles.push(file);
            }
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const entries = await new Promise(r => {
                dirReader.readEntries(r, (err) => { console.error(err); r([]); });
            });
            for (const child of entries) {
                await readEntry(child);
            }
        }
    }

    for (const item of items) {
        if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry) await readEntry(entry);
        }
    }
    
    transmitFilesToBackground(validFiles);
});

function handleFileSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const validFiles = [];
    
    for (const file of files) {
        if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name)) {
            validFiles.push(file);
        }
    }
    
    transmitFilesToBackground(validFiles, e.target);
}

function transmitFilesToBackground(validFiles, sourceInput) {
    if (validFiles.length > 0) {
        showStatus(`Loading ${validFiles.length} files...`, 'info');
        
        let i = 0;
        function sendChunk() {
            const chunk = validFiles.slice(i, i + 50);
            bc.postMessage({ type: 'ADD_FILES', files: chunk, skipBroadcast: true });
            i += 50;
            if (i < validFiles.length) {
                setTimeout(sendChunk, 5); // yield event loop to prevent IPC freeze
            } else {
                bc.postMessage({ type: 'GET_STATE' }); // Final sync
                showStatus(`Added ${validFiles.length} tracks`, 'success');
                if (sourceInput) sourceInput.value = '';
            }
        }
        sendChunk();
    } else {
        showStatus('No audio files found', 'error');
        if (sourceInput) sourceInput.value = '';
    }
}

// -- UI BINDINGS --
playBtn?.addEventListener('click', () => {
    if (localTracksCount === 0) {
        showStatus('Add files first!', 'error');
        return;
    }
    if (player.classList.contains('playing')) {
        bc.postMessage({ type: 'PAUSE' });
    } else {
        bc.postMessage({ type: 'PLAY' });
    }
});

prevBtn?.addEventListener('click', () => bc.postMessage({ type: 'PREV' }));
nextBtn?.addEventListener('click', () => bc.postMessage({ type: 'NEXT' }));

progressBar?.addEventListener('click', (e) => {
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const durationStr = durationEl.textContent;
    const parts = durationStr.split(':');
    if (parts.length === 2) {
        const totalDuration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        const newTime = (clickX / width) * totalDuration;
        bc.postMessage({ type: 'SEEK', time: newTime });
    }
});

volume?.addEventListener('input', (e) => {
    bc.postMessage({ type: 'SET_VOLUME', volume: parseFloat(e.target.value) });
});

player?.addEventListener('wheel', (e) => {
    if (e.target.closest('.playlist')) return; 
    e.preventDefault();
    let vol = parseFloat(volume.value);
    if (e.deltaY < 0) vol = Math.min(1, vol + 0.05);
    else vol = Math.max(0, vol - 0.05);
    
    volume.value = vol;
    bc.postMessage({ type: 'SET_VOLUME', volume: vol });
}, { passive: false });

clearPlaylistBtn?.addEventListener('click', () => {
    bc.postMessage({ type: 'CLEAR' });
});

sortBtn?.addEventListener('click', () => {
    if (localTracksCount < 2) return;
    if (sortMode === 'default' || sortMode === 'dateDesc') {
        sortMode = 'nameAsc';
        sortBtn.textContent = '🔤 Name (A-Z)';
    } else if (sortMode === 'nameAsc') {
        sortMode = 'nameDesc';
        sortBtn.textContent = '🔤 Name (Z-A)';
    } else if (sortMode === 'nameDesc') {
        sortMode = 'dateAsc';
        sortBtn.textContent = '📅 Date (Old)';
    } else { // sortMode === 'dateAsc'
        sortMode = 'dateDesc';
        sortBtn.textContent = '📅 Date (New)';
    }
    sortBtn.classList.add('active');
    bc.postMessage({ type: 'SORT', mode: sortMode });
});

shuffleBtn?.addEventListener('click', () => {
    bc.postMessage({ type: 'SHUFFLE' });
});

savePlaylistBtn?.addEventListener('click', () => {
    if (localTracksCount === 0) {
        showStatus('Playlist is empty!', 'error');
        return;
    }
    bc.postMessage({ type: 'GET_STATE_FOR_SAVE' });
});

loadPlaylistBtn?.addEventListener('click', () => {
    chrome.windows.create({
        url: chrome.runtime.getURL('loader.html'),
        type: 'popup',
        width: 420,
        height: 320,
        focused: true
    });
});

// UI Toggles
addMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    addMenuContent.style.display = addMenuContent.style.display === 'block' ? 'none' : 'block';
    settingsMenu.style.display = 'none';
});

mainSettingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
    addMenuContent.style.display = 'none';
});

document?.addEventListener('click', () => {
    addMenuContent.style.display = 'none';
    settingsMenu.style.display = 'none';
});

toggleThemeBtn?.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        toggleThemeBtn.textContent = '🌙 Dark Theme: On';
        localStorage.setItem('audioPlayerTheme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        toggleThemeBtn.textContent = '🌙 Dark Theme: Off';
        localStorage.setItem('audioPlayerTheme', 'light');
    }
});

repeatBtn?.addEventListener('click', () => {
    if (repeatMode === 'playlist') repeatMode = 'track';
    else if (repeatMode === 'track') repeatMode = 'off';
    else repeatMode = 'playlist';
    
    localStorage.setItem('audioPlayerRepeat', repeatMode);
    updateRepeatIcon();
    bc.postMessage({ type: 'SET_REPEAT', mode: repeatMode });
});

// -- PLAYLIST RENDERING --
let draggedItemIndex = null;

function renderPlaylist(tracks, currentTrackIndex) {
    const fragment = document.createDocumentFragment();
    tracks.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item' + (index === currentTrackIndex ? ' active' : '');
        item.draggable = true;
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="playlist-item-info">
                <div class="playlist-item-name">${index + 1}. ${track.name}</div>
                <div class="playlist-item-duration">${formatTime(track.duration)}</div>
            </div>
            <div class="playlist-item-arrows">
                <button class="arrow-btn up">▲</button>
                <button class="arrow-btn down">▼</button>
            </div>
            <button class="playlist-item-remove">×</button>
        `;
        
        item?.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'button') {
                bc.postMessage({ type: 'PLAY_INDEX', index });
            }
        });

        item?.addEventListener('dragstart', function(e) {
            draggedItemIndex = index;
            e.dataTransfer.effectAllowed = 'move';
        });
        item?.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        });
        item?.addEventListener('dragenter', function() { this.classList.add('drag-over'); });
        item?.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
        item?.addEventListener('drop', function(e) {
            e.stopPropagation();
            this.classList.remove('drag-over');
            if (draggedItemIndex !== null && draggedItemIndex !== index) {
                bc.postMessage({ type: 'REORDER', fromIndex: draggedItemIndex, toIndex: index });
            }
            return false;
        });

        item.querySelector('.playlist-item-remove')?.addEventListener('click', (e) => {
            e.stopPropagation();
            bc.postMessage({ type: 'REMOVE', index });
        });
        item.querySelector('.up')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index > 0) bc.postMessage({ type: 'REORDER', fromIndex: index, toIndex: index - 1 });
        });
        item.querySelector('.down')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index < tracks.length - 1) bc.postMessage({ type: 'REORDER', fromIndex: index, toIndex: index + 1 });
        });

        fragment.appendChild(item);
    });
    
    playlistEl.innerHTML = '';
    playlistEl.appendChild(fragment);
}

// ── IndexedDB helpers ──────────────────────────────────────────────
function openHandlesDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('AudioPlayerHandles', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('dirs')) {
                db.createObjectStore('dirs', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('savedPlaylist')) {
                db.createObjectStore('savedPlaylist', { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

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
            showStatus(`Playlist saved (${trackNames.length} tracks)`, 'success');
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}

