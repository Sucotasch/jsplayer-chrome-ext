// offscreen.js — Audio engine with silent keepalive
const audio = document.getElementById('audio');
const bc = new BroadcastChannel('audio_player_channel');

let tracks = [];
let currentTrackIndex = 0;
let currentObjectUrl = null;

// ────────────────────────────────────────────────────────────────────


let repeatMode = 'playlist'; // playlist, track, off

audio.addEventListener('ended', () => {
    if (tracks.length > 0) {
        if (repeatMode === 'track') {
            audio.currentTime = 0;
            audio.play();
        } else if (repeatMode === 'playlist') {
            currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
            playCurrent();
        } else if (repeatMode === 'off') {
            if (currentTrackIndex < tracks.length - 1) {
                currentTrackIndex++;
                playCurrent();
            } else {
                audio.pause();
                broadcastState();
            }
        }
    }
});

audio.addEventListener('timeupdate', () => {
    bc.postMessage({
        type: 'TIME_UPDATE',
        currentTime: audio.currentTime,
        duration: audio.duration
    });
});

audio.onloadedmetadata = () => {
    if (tracks[currentTrackIndex]) {
        tracks[currentTrackIndex].duration = audio.duration;
        broadcastState();
    }
};

bc.onmessage = async (e) => {
    const msg = e.data;
    switch (msg.type) {
        case 'PING':
            bc.postMessage({ type: 'PONG' });
            break;
        case 'GET_STATE':
            broadcastState();
            break;
        case 'ADD_FILES': {
            const newTracks = msg.files.map((file) => ({
                name: file.name.replace(/\.[^/.]+$/, ''),
                duration: 0,
                file: file
            }));
            tracks.push(...newTracks);
            
            // Acknowledge chunk received to prevent buffer overflow
            bc.postMessage({ type: 'ADD_FILES_ACK', count: msg.files.length });

            if (!msg.skipBroadcast) broadcastState();
            break;
        }
        case 'SET_REPEAT':
            repeatMode = msg.mode;
            break;
        case 'PLAY_INDEX':
            currentTrackIndex = msg.index;
            await playCurrent();
            break;
        case 'PLAY':
            if (tracks.length > 0) {
                if (!currentObjectUrl) playCurrent();
                else audio.play();
            }
            broadcastState();
            break;
        case 'PAUSE':
            audio.pause();
            broadcastState();
            break;
        case 'RESUME_STATE':
            currentTrackIndex = msg.index || 0;
            await playCurrent();
            if (msg.time) audio.currentTime = msg.time;
            if (msg.volume !== undefined) audio.volume = msg.volume;
            break;
        case 'TOGGLE_PLAY':
            if (tracks.length > 0) {
                if (audio.paused) {
                    if (!currentObjectUrl) playCurrent();
                    else audio.play();
                } else {
                    audio.pause();
                }
            }
            broadcastState();
            break;
        case 'NEXT':
            if (tracks.length > 0) {
                currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
                await playCurrent();
            }
            break;
        case 'PREV':
            if (tracks.length > 0) {
                currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
                await playCurrent();
            }
            break;
        case 'SET_VOLUME':
            audio.volume = msg.volume;
            break;
        case 'SEEK':
            audio.currentTime = msg.time;
            break;
        case 'CLEAR':
            tracks = [];
            currentTrackIndex = 0;
            audio.pause();
            if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
            broadcastState();
            break;
        case 'REMOVE':
            tracks.splice(msg.index, 1);
            if (currentTrackIndex === msg.index) {
                if (tracks.length === 0) {
                    audio.pause();
                    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
                } else {
                    if (currentTrackIndex >= tracks.length) currentTrackIndex = 0;
                    playCurrent();
                }
            } else if (currentTrackIndex > msg.index) {
                currentTrackIndex--;
            }
            broadcastState();
            break;
        case 'REORDER': {
            const [movedTrack] = tracks.splice(msg.fromIndex, 1);
            tracks.splice(msg.toIndex, 0, movedTrack);
            if (currentTrackIndex === msg.fromIndex) {
                currentTrackIndex = msg.toIndex;
            } else {
                if (currentTrackIndex > msg.fromIndex && currentTrackIndex <= msg.toIndex) currentTrackIndex--;
                else if (currentTrackIndex < msg.fromIndex && currentTrackIndex >= msg.toIndex) currentTrackIndex++;
            }
            broadcastState();
            break;
        }
        case 'SORT': {
            if (tracks.length < 2) return;
            const ct = tracks[currentTrackIndex];
            tracks.sort((a, b) => {
                if (msg.mode === 'nameAsc') return a.name.localeCompare(b.name);
                if (msg.mode === 'nameDesc') return b.name.localeCompare(a.name);
                if (msg.mode === 'dateAsc') return a.file.lastModified - b.file.lastModified;
                if (msg.mode === 'dateDesc') return b.file.lastModified - a.file.lastModified;
                return 0;
            });
            if (ct) currentTrackIndex = tracks.indexOf(ct);
            broadcastState();
            break;
        }
        case 'SHUFFLE': {
            if (tracks.length < 2) return;
            const cur = tracks[currentTrackIndex];
            
            // Fisher-Yates Shuffle (O(n) and unbiased)
            for (let i = tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
            }
            
            if (cur) currentTrackIndex = tracks.indexOf(cur);
            broadcastState();
            break;
        }
        case 'GET_STATE_FOR_SAVE':
            bc.postMessage({
                type: 'STATE_FOR_SAVE',
                playlistId: msg.playlistId || 'session-last',
                trackNames: tracks.map(t => t.file.name),
                currentTrackIndex,
                currentTime: audio.currentTime,
                volume: audio.volume
            });
            break;
    }
};

async function playCurrent() {
    if (!tracks[currentTrackIndex]) return;
    const file = tracks[currentTrackIndex].file;
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);
    audio.src = currentObjectUrl;
    await audio.play();
    broadcastState();
}

function broadcastState() {
    const metadataList = tracks.map(t => ({ name: t.name, duration: t.duration }));
    bc.postMessage({
        type: 'STATE_UPDATE',
        tracks: metadataList,
        currentTrackIndex,
        isPlaying: !audio.paused,
        volume: audio.volume
    });
}

window.addEventListener('beforeunload', () => {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    bc.close();
});
