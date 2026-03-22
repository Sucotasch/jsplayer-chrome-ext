const fs = require('fs');
const path = require('path');
const src = 'C:\\Users\\sucot\\.gemini\\antigravity\\brain\\2a5b4213-1467-4303-8bfa-2dab8e75bb7e\\silver_3d_music_icon_1774178024814.png';

try {
    const stat = fs.statSync(src);
    console.log("Source image found, size:", stat.size);
    fs.copyFileSync(src, 'icons/img16.png');
    fs.copyFileSync(src, 'icons/img48.png');
    fs.copyFileSync(src, 'icons/img128.png');
    
    // Delete old
    ['16', '48', '128'].forEach(n => {
       try { fs.unlinkSync('icons/icon' + n + '.png'); } catch(e){}
    });
    console.log("Old icons deleted and new copied.");
} catch (e) {
    console.error("Error copying AI image:", e);
}
