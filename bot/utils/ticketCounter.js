const path = require('path');
const { readJson, writeJsonAtomic } = require('./jsonStore');

const counterPath = path.join(__dirname, '../ticket_counter.json');

function getTicketNumber() {
    try {
        const counter = readJson(counterPath, { count: 0 });
        const count = Number(counter.count || 0) + 1;
        writeJsonAtomic(counterPath, { count });
        return count.toString().padStart(3, '0');
    } catch (e) {
        console.error("Error updating ticket counter:", e);
        return "000";
    }
}

module.exports = { getTicketNumber };
