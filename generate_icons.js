const fs = require('fs');
fs.mkdirSync('icons', {recursive:true});
const iconBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAABlBMVEX///9mfuozH+SgAAAAHklEQVR42mNgoBr4Hw4E8w/Q/qED1H+oQGkA1UABAAK2K8E+4p1PAAAAAElFTkSuQmCC";
const buf = Buffer.from(iconBase64, 'base64');
fs.writeFileSync('icons/img16.png', buf);
fs.writeFileSync('icons/img48.png', buf);
fs.writeFileSync('icons/img128.png', buf);
