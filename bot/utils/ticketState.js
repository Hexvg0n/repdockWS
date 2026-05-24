const path = require('path');
const { readJson, writeJsonAtomic } = require('./jsonStore');

const statePath = path.join(__dirname, '../ticket_state.json');

function emptyState() {
    return { tickets: {} };
}

function getState() {
    const state = readJson(statePath, emptyState());
    return state && typeof state === 'object' && state.tickets && typeof state.tickets === 'object'
        ? state
        : emptyState();
}

function saveState(state) {
    writeJsonAtomic(statePath, state);
}

function findOpenTicket(guildId, userId) {
    const state = getState();
    return Object.values(state.tickets).find((ticket) => (
        ticket
        && ticket.guildId === guildId
        && ticket.userId === userId
        && ticket.status !== 'closed'
    )) || null;
}

function getTicket(channelId) {
    return getState().tickets[channelId] || null;
}

function upsertTicket(channelId, data) {
    const state = getState();
    state.tickets[channelId] = {
        ...(state.tickets[channelId] || {}),
        ...data,
        channelId,
        updatedAt: new Date().toISOString()
    };
    saveState(state);
    return state.tickets[channelId];
}

function closeTicket(channelId, data = {}) {
    return upsertTicket(channelId, {
        ...data,
        status: 'closed',
        closedAt: new Date().toISOString()
    });
}

function removeTicket(channelId) {
    const state = getState();
    delete state.tickets[channelId];
    saveState(state);
}

module.exports = {
    closeTicket,
    findOpenTicket,
    getTicket,
    removeTicket,
    upsertTicket
};
