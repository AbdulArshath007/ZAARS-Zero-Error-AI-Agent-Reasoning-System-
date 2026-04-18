
const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');

let divOpen = 0;
let divClose = 0;
let braceOpen = 0;
let braceClose = 0;
let parenOpen = 0;
let parenClose = 0;

const tokens = content.match(/<div|<\/div>|\{|\}|\(|\)/g);

tokens.forEach(t => {
    if (t === '<div') divOpen++;
    if (t === '</div>') divClose++;
    if (t === '{') braceOpen++;
    if (t === '}') braceClose++;
    if (t === '(') parenOpen++;
    if (t === ')') parenClose++;
});

console.log(`Divs: ${divOpen} open, ${divClose} closed. Balance: ${divOpen - divClose}`);
console.log(`Braces: ${braceOpen} open, ${braceClose} closed. Balance: ${braceOpen - braceClose}`);
console.log(`Parens: ${parenOpen} open, ${parenClose} closed. Balance: ${parenOpen - parenClose}`);
