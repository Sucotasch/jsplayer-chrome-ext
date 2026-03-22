const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check if message is for background script directly
    if (message.type === 'SETUP_OFFSCREEN') {
        setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH).then(() => {
            sendResponse({ status: 'done' });
        });
        return true; // Keep message channel open for async response
    }
});

async function setupOffscreenDocument(path) {
    // Check if the offscreen document is already created
    if (await chrome.offscreen.hasDocument()) {
        return;
    }

    // Create the offscreen document
    // We request AUDIO_PLAYBACK to keep background audio playing
    await chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: "To play background audio without interruptions when popup closes."
    });
}
