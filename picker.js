// picker.js — Uses showDirectoryPicker to get a reusable DirectoryHandle
const bc = new BroadcastChannel('audio_player_channel');
const btn = document.getElementById('pickBtn');
const statusTitle = document.getElementById('statusTitle');
const statusDesc = document.getElementById('statusDesc');

// ── IndexedDB helper for storing DirectoryHandles ──────────────────
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

async function storeDirHandle(handle) {
    const db = await openHandlesDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('dirs', 'readwrite');
        tx.objectStore('dirs').put({ id: handle.name, handle });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
// ────────────────────────────────────────────────────────────────────

btn.addEventListener('click', async () => {
    try {
        const dirHandle = await window.showDirectoryPicker();

        statusTitle.textContent = 'Initializing engine...';
        statusDesc.textContent = 'Please wait.';
        btn.style.display = 'none';

        // 1. Ensure Offscreen document exists
        await new Promise(resolve => {
            chrome.runtime.sendMessage({ type: 'SETUP_OFFSCREEN' }, () => resolve());
        });

        // 2. Handshake: Wait for PONG
        let isReady = false;
        const pongListener = (e) => { if (e.data.type === 'PONG') isReady = true; };
        bc.addEventListener('message', pongListener);
        
        for (let attempt = 0; attempt < 10; attempt++) {
            bc.postMessage({ type: 'PING' });
            await new Promise(r => setTimeout(r, 200));
            if (isReady) break;
        }
        bc.removeEventListener('message', pongListener);

        if (!isReady) {
            statusTitle.textContent = 'Engine error';
            statusDesc.textContent = 'Could not connect to audio engine. Please try again.';
            btn.style.display = 'block';
            return;
        }

        const validFiles = [];
        async function traverse(handle) {
            for await (const entry of handle.values()) {
                try {
                    if (entry.kind === 'file') {
                        if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(entry.name)) {
                            const file = await entry.getFile();
                            validFiles.push(file);
                            if (validFiles.length % 50 === 0) {
                                statusTitle.textContent = `Found ${validFiles.length} tracks...`;
                            }
                        }
                    } else if (entry.kind === 'directory') {
                        await traverse(entry);
                    }
                } catch (e) {
                    console.warn('Skipping file due to error:', entry.name, e);
                }
            }
        }
        statusTitle.textContent = 'Scanning folders...';
        await traverse(dirHandle);

        if (validFiles.length > 0) {
            // Store the handle for future "Load playlist" use
            await storeDirHandle(dirHandle);

            statusTitle.textContent = `Transferring ${validFiles.length} tracks...`;
            
            // 3. ACK-based transfer logic
            let i = 0;
            let ackReceived = false;
            const ackListener = (e) => { if (e.data.type === 'ADD_FILES_ACK') ackReceived = true; };
            bc.addEventListener('message', ackListener);

            try {
                while (i < validFiles.length) {
                    const chunk = validFiles.slice(i, i + 50);
                    ackReceived = false;
                    bc.postMessage({ type: 'ADD_FILES', files: chunk, skipBroadcast: true });
                    
                    // Wait for ACK with timeout
                    for (let t = 0; t < 20; t++) { // 2 second timeout per chunk
                        if (ackReceived) break;
                        await new Promise(r => setTimeout(r, 100));
                    }
                    
                    i += 50;
                    statusTitle.textContent = `Transferred ${Math.min(i, validFiles.length)} of ${validFiles.length}...`;
                }
                
                bc.postMessage({ type: 'GET_STATE' });
                statusTitle.textContent = 'Done!';
                statusDesc.textContent = `${validFiles.length} tracks added. Window will close.`;
                setTimeout(() => window.close(), 1000);
            } finally {
                bc.removeEventListener('message', ackListener);
            }
        } else {
            statusTitle.textContent = 'No audio files found';
            statusDesc.textContent = 'The folder does not contain supported audio formats.';
            setTimeout(() => window.close(), 3000);
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            window.close();
        } else {
            statusTitle.textContent = 'Error';
            statusDesc.textContent = err.message;
        }
    }
});
