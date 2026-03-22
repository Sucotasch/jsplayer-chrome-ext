const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const css = styleMatch ? styleMatch[1].trim() : '';
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const js = scriptMatch ? scriptMatch[1].trim() : '';

let popupHtml = html.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="popup.css">');
popupHtml = popupHtml.replace(/<script>[\s\S]*?<\/script>/, '<script src="popup.js"></script>');
// Remove the audio tag since it's offscreen now
popupHtml = popupHtml.replace(/<audio id="audio"><\/audio>/, '');

fs.writeFileSync('popup.css', css);
// Don't overwrite popup.js, because we ALREADY WROTE IT! Wait!
// Only write popupHtml and popup.css
fs.writeFileSync('popup.html', popupHtml);
