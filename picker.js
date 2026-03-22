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

        statusTitle.textContent = 'Сканирование папки...';
        statusDesc.textContent = 'Пожалуйста, подождите.';
        btn.style.display = 'none';

        const validFiles = [];
        async function traverse(handle) {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file') {
                    if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(entry.name)) {
                        const file = await entry.getFile();
                        validFiles.push(file);
                        if (validFiles.length % 50 === 0) {
                            statusTitle.textContent = `Найдено ${validFiles.length} треков...`;
                        }
                    }
                } else if (entry.kind === 'directory') {
                    await traverse(entry);
                }
            }
        }
        await traverse(dirHandle);

        if (validFiles.length > 0) {
            // Store the handle for future "Load playlist" use
            await storeDirHandle(dirHandle);

            statusTitle.textContent = `Передача ${validFiles.length} треков в плеер...`;
            let i = 0;
            function sendChunk() {
                const chunk = validFiles.slice(i, i + 50);
                bc.postMessage({ type: 'ADD_FILES', files: chunk, skipBroadcast: true });
                i += 50;
                if (i < validFiles.length) {
                    statusTitle.textContent = `Передано ${Math.min(i, validFiles.length)} из ${validFiles.length}...`;
                    setTimeout(sendChunk, 5);
                } else {
                    bc.postMessage({ type: 'GET_STATE' });
                    statusTitle.textContent = 'Готово!';
                    statusDesc.textContent = `${validFiles.length} треков добавлено. Окно закроется.`;
                    setTimeout(() => window.close(), 800);
                }
            }
            sendChunk();
        } else {
            statusTitle.textContent = 'Аудиофайлы не найдены';
            statusDesc.textContent = 'Папка не содержит поддерживаемых форматов.';
            setTimeout(() => window.close(), 3000);
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            window.close();
        } else {
            statusTitle.textContent = 'Ошибка';
            statusDesc.textContent = err.message;
        }
    }
});
