// offscreen.js — Audio engine with silent keepalive
const audio = document.getElementById('audio');
const bc = new BroadcastChannel('audio_player_channel');

let tracks = [];
let currentTrackIndex = 0;
let currentObjectUrl = null;

// ── Silent keepalive ────────────────────────────────────────────────
// Prevents Chrome from killing the offscreen document when user pauses.
// A tiny programmatic WAV loops silently on a second <audio> element.
const keepaliveAudio = document.createElement('audio');
keepaliveAudio.loop = true;
keepaliveAudio.volume = 0.001; // near-silent but non-zero so Chrome counts it

function createSilentWav() {
    const sr = 8000, ch = 1, bps = 8, dur = 1;
    const samples = sr * dur;
    const dataSize = samples * ch * (bps / 8);
    const buf = new ArrayBuffer(44 + dataSize);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0,'RIFF'); v.setUint32(4, 36+dataSize, true); w(8,'WAVE');
    w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true);
    v.setUint16(22,ch,true); v.setUint32(24,sr,true);
    v.setUint32(28,sr*ch*(bps/8),true); v.setUint16(32,ch*(bps/8),true);
    v.setUint16(34,bps,true);
    w(36,'data'); v.setUint32(40,dataSize,true);
    for (let i = 44; i < 44 + dataSize; i++) v.setUint8(i, 128);
    return new Blob([buf], { type: 'audio/wav' });
}

function startKeepalive() {
    if (!keepaliveAudio.src) {
        keepaliveAudio.src = URL.createObjectURL(createSilentWav());
    }
    keepaliveAudio.play().catch(() => {});
}

function stopKeepalive() {
    keepaliveAudio.pause();
}
// ────────────────────────────────────────────────────────────────────

audio.addEventListener('ended', () => {
    if (tracks.length > 0) {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        playCurrent();
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
        case 'GET_STATE':
            broadcastState();
            break;
        case 'ADD_FILES': {
            const wasEmpty = tracks.length === 0;
            const newTracks = msg.files.map((file) => ({
                name: file.name.replace(/\.[^/.]+$/, ''),
                duration: 0,
                file: file
            }));
            tracks.push(...newTracks);
            if (wasEmpty && newTracks.length > 0) {
                startKeepalive();
                currentTrackIndex = 0;
                playCurrent();
            }
            if (!msg.skipBroadcast) broadcastState();
            break;
        }
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
            // keepalive keeps running — that's the whole point
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
            stopKeepalive();
            broadcastState();
            break;
        case 'REMOVE':
            tracks.splice(msg.index, 1);
            if (currentTrackIndex === msg.index) {
                if (tracks.length === 0) {
                    audio.pause();
                    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
                    stopKeepalive();
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
            tracks.sort(() => Math.random() - 0.5);
            if (cur) currentTrackIndex = tracks.indexOf(cur);
            broadcastState();
            break;
        }
        case 'GET_STATE_FOR_SAVE':
            bc.postMessage({
                type: 'STATE_FOR_SAVE',
                trackNames: tracks.map(t => t.file.name),
                currentTrackIndex,
                volume: audio.volume
            });
            break;
    }
};

async function playCurrent() {
    if (!tracks[currentTrackIndex]) return;
    startKeepalive();
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
