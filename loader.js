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
            statusTitle.textContent = 'Нет сохранённого плейлиста';
            statusDesc.textContent = 'Сначала сохраните плейлист в плеере.';
            setTimeout(() => window.close(), 2500);
            return;
        }

        statusDesc.textContent = `Сохранено ${saved.trackNames.length} треков. Запрашиваю доступ...`;

        // 2. Read stored directory handles
        const handles = await new Promise((resolve, reject) => {
            const tx = db.transaction('dirs', 'readonly');
            const req = tx.objectStore('dirs').getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!handles || handles.length === 0) {
            statusTitle.textContent = 'Нет сохранённых папок';
            statusDesc.textContent = 'Сначала добавьте папку через плеер.';
            setTimeout(() => window.close(), 2500);
            return;
        }

        // 3. Request permissions (Chrome shows "Allow" button for each folder)
        statusTitle.textContent = 'Подтвердите доступ к папкам';
        statusDesc.textContent = 'Нажмите "Разрешить" в появившихся запросах Chrome.';

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
            statusTitle.textContent = 'Доступ отклонён';
            statusDesc.textContent = 'Без доступа к папкам восстановить плейлист невозможно.';
            setTimeout(() => window.close(), 3000);
            return;
        }

        // 4. Scan granted directories
        statusTitle.textContent = 'Сканирование папок...';
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
                                progressEl.textContent = `Найдено ${scanned} аудиофайлов...`;
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

        progressEl.textContent = `Всего найдено ${fileMap.size} аудиофайлов`;

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
            statusTitle.textContent = 'Файлы не найдены';
            statusDesc.textContent = 'Ни один трек из плейлиста не был найден в папках.';
            setTimeout(() => window.close(), 3000);
            return;
        }

        // 6. Clear old and send restored files
        statusTitle.textContent = `Передача ${orderedFiles.length} треков в плеер...`;
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
                progressEl.textContent = `Передано ${Math.min(i, orderedFiles.length)} из ${orderedFiles.length}...`;
                setTimeout(sendChunk, 5);
            } else {
                bc.postMessage({ type: 'GET_STATE' });

                // Navigate to saved track
                const targetIndex = Math.min(saved.currentTrackIndex || 0, orderedFiles.length - 1);
                setTimeout(() => {
                    bc.postMessage({ type: 'PLAY_INDEX', index: targetIndex });
                }, 200);

                if (missing.length > 0) {
                    statusTitle.textContent = `Восстановлено ${orderedFiles.length} из ${saved.trackNames.length}`;
                    statusDesc.textContent = `Не найдено: ${missing.length} треков.`;
                } else {
                    statusTitle.textContent = 'Плейлист полностью восстановлен!';
                    statusDesc.textContent = `${orderedFiles.length} треков загружено.`;
                }
                progressEl.textContent = '';
                setTimeout(() => window.close(), 1200);
            }
        }
        sendChunk();

    } catch (err) {
        console.error(err);
        statusTitle.textContent = 'Ошибка';
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
