const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../backend/node_modules');
const dest = path.join(__dirname, '../dist/win-unpacked/resources/backend/node_modules');

console.log(`Copying node_modules...`);
console.log(`From: ${source}`);
console.log(`To:   ${dest}`);

if (!fs.existsSync(source)) {
    console.error('CRITICAL: Source node_modules not found!');
    process.exit(1);
}

// Recursive copy function
function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });

    fs.readdirSync(from).forEach(element => {
        if (fs.lstatSync(path.join(from, element)).isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

try {
    copyFolderSync(source, dest);
    console.log('Successfully copied node_modules to packaged app.');
} catch (err) {
    console.error('Failed to copy node_modules:', err);
    process.exit(1);
}
