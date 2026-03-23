const fs = require('fs');
let js = fs.readFileSync('popup.js', 'utf8');

// Replace standard addEventListener with optional chaining to prevent cascading crashes
js = js.replace(/([a-zA-Z0-9_]+)\.addEventListener\(/g, '$1?.addEventListener(');
js = js.replace(/document\.addEventListener\(/g, 'document?.addEventListener(');
js = js.replace(/document\.body\.addEventListener\(/g, 'document.body?.addEventListener(');
js = js.replace(/item\.querySelector\('([^']+)'\)\.addEventListener\(/g, "item.querySelector('$1')?.addEventListener(");

// Also add a global error handler to show exactly what's failing on the screen
const errorHandler = `
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
`;

if (!js.includes('window.onerror')) {
    js = errorHandler + '\n' + js;
}

fs.writeFileSync('popup.js', js);
console.log("popup.js forcefully patched with optional chaining and error handler!");
