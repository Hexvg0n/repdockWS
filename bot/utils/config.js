const fs = require('fs');
const path = require('path');

function loadConfig() {
    try {
        // Config is in the parent bot directory relative to utils/
        const configPath = path.join(__dirname, '../ticket_config.json');
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error loading config:", e);
    }
    return null;
}

module.exports = { loadConfig };
