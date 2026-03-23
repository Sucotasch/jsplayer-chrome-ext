// loader.js — Restores playlist from IndexedDB handles in a full window context
const bc = new BroadcastChannel('audio_player_channel');
const statusTitle = document.getElementById('statusTitle');
const statusDesc = document.getElementById('statusDesc');
const progressEl = document.getElementById('progress');

function openHandlesDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('AudioPlayerHandles', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('dirs')) db.createObjectStore('dirs', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('savedPlaylist')) db.createObjectStore('savedPlaylist', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function loadPlaylist() {
    try {
        const db = await openHandlesDB();

        // 1. Read saved playlist
        const saved = await new Promise((resolve, reject) => {
            const tx = db.transaction('savedPlaylist', 'readonly');
            const req = tx.objectStore('savedPlaylist').get('current');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!saved || !saved.trackNames || saved.trackNames.length === 0) {
            statusTitle.textContent = 'No saved playlist';
            statusDesc.textContent = 'Save a playlist in the player first.';
            setTimeout(() => window.close(), 2500);
            return;
        }

        statusDesc.textContent = `Saved ${saved.trackNames.length} tracks. Requesting access...`;

        // 2. Read stored directory handles
        const handles = await new Promise((resolve, reject) => {
            const tx = db.transaction('dirs', 'readonly');
            const req = tx.objectStore('dirs').getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!handles || handles.length === 0) {
            statusTitle.textContent = 'No saved folders';
            statusDesc.textContent = 'Add a folder via the player first.';
            setTimeout(() => window.close(), 2500);
            return;
        }

        // 3. Request permissions (Chrome shows "Allow" button for each folder)
        statusTitle.textContent = 'Confirm Folder Access';
        statusDesc.textContent = 'Click "Allow" in the Chrome permission prompts.';

        const grantedHandles = [];
        for (const entry of handles) {
            try {
                const perm = await entry.handle.requestPermission({ mode: 'read' });
                if (perm === 'granted') {
                    grantedHandles.push(entry.handle);
                }
            } catch (e) {
                console.warn('Permission denied for', entry.id, e);
            }
        }

        if (grantedHandles.length === 0) {
            statusTitle.textContent = 'Access Denied';
            statusDesc.textContent = 'Cannot restore playlist without folder access.';
            setTimeout(() => window.close(), 3000);
            return;
        }

        // 4. Scan granted directories
        statusTitle.textContent = 'Scanning folders...';
        const fileMap = new Map();
        let scanned = 0;

        async function scanDir(handle) {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file') {
                    if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(entry.name)) {
                        if (!fileMap.has(entry.name)) {
                            const file = await entry.getFile();
                            fileMap.set(entry.name, file);
                            scanned++;
                            if (scanned % 50 === 0) {
                                progressEl.textContent = `Found ${scanned} audio files...`;
                            }
                        }
                    }
                } else if (entry.kind === 'directory') {
                    await scanDir(entry);
                }
            }
        }

        for (const h of grantedHandles) {
            await scanDir(h);
        }

        progressEl.textContent = `Total ${fileMap.size} audio files found`;

        // 5. Match to saved order
        const orderedFiles = [];
        const missing = [];
        for (const name of saved.trackNames) {
            if (fileMap.has(name)) {
                orderedFiles.push(fileMap.get(name));
            } else {
                missing.push(name);
            }
        }

        if (orderedFiles.length === 0) {
            statusTitle.textContent = 'Files not found';
            statusDesc.textContent = 'No tracks from the playlist were found in the selected folders.';
            setTimeout(() => window.close(), 3000);
            return;
        }

        // 6. Clear old and send restored files
        statusTitle.textContent = `Transferring ${orderedFiles.length} tracks...`;
        bc.postMessage({ type: 'CLEAR' });

        // Restore volume
        if (saved.volume !== undefined) {
            bc.postMessage({ type: 'SET_VOLUME', volume: saved.volume });
        }

        // Send in chunks
        let i = 0;
        function sendChunk() {
            const chunk = orderedFiles.slice(i, i + 50);
            bc.postMessage({ type: 'ADD_FILES', files: chunk, skipBroadcast: true });
            i += 50;
            if (i < orderedFiles.length) {
                progressEl.textContent = `Transferred ${Math.min(i, orderedFiles.length)} of ${orderedFiles.length}...`;
                setTimeout(sendChunk, 5);
            } else {
                bc.postMessage({ type: 'GET_STATE' });

                // Navigate to saved track
                const targetIndex = Math.min(saved.currentTrackIndex || 0, orderedFiles.length - 1);
                setTimeout(() => {
                    bc.postMessage({ type: 'PLAY_INDEX', index: targetIndex });
                }, 200);

                if (missing.length > 0) {
                    statusTitle.textContent = `Restored ${orderedFiles.length} of ${saved.trackNames.length}`;
                    statusDesc.textContent = `Missing: ${missing.length} tracks.`;
                } else {
                    statusTitle.textContent = 'Playlist fully restored!';
                    statusDesc.textContent = `${orderedFiles.length} tracks loaded.`;
                }
                progressEl.textContent = '';
                setTimeout(() => window.close(), 1200);
            }
        }
        sendChunk();

    } catch (err) {
        console.error(err);
        statusTitle.textContent = 'Error';
        statusDesc.textContent = err.message;
        setTimeout(() => window.close(), 4000);
    }
}

// Start only on user click (required for requestPermission user gesture)
const startBtn = document.getElementById('startBtn');
startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    loadPlaylist();
});
