const fs = require('fs');
const path = require('path');

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;

        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON from ${filePath}:`, error);
        return fallback;
    }
}

function writeJsonAtomic(filePath, value) {
    const directory = path.dirname(filePath);
    const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.tmp`);

    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
}

module.exports = { readJson, writeJsonAtomic };
