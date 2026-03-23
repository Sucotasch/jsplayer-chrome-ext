const fs = require('fs');
const js = fs.readFileSync('popup.js', 'utf8');
const html = fs.readFileSync('popup.html', 'utf8');

const regex = /document\.getElementById\('([^']+)'\)/g;
let match;
let foundMissing = false;
while ((match = regex.exec(js)) !== null) {
    const id = match[1];
    // Check if id exists in html
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
        console.log("MISSING ID IN HTML:", id);
        foundMissing = true;
    }
}
if (!foundMissing) console.log("All IDs found in HTML!");
