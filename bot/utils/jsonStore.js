const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function readJson(filePath, fallback) {
    try {
        if (!fsSync.existsSync(filePath)) return fallback;

        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON from ${filePath}:`, error);
        return fallback;
    }
}

async function writeJsonAtomic(filePath, value) {
    const directory = path.dirname(filePath);
    const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.tmp`);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
    await fs.rename(tempPath, filePath);
}

module.exports = { readJson, writeJsonAtomic };
