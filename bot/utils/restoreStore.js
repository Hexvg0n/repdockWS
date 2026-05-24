const path = require('path');
const { readJson, writeJsonAtomic } = require('./jsonStore');

const restoreUsersPath = path.join(__dirname, '../restore_users.json');

function getRestoreUsers() {
    const data = readJson(restoreUsersPath, { users: {} });
    return data && typeof data === 'object' && data.users && typeof data.users === 'object'
        ? data
        : { users: {} };
}

function saveRestoreUsers(data) {
    writeJsonAtomic(restoreUsersPath, data);
}

function getRestoreUser(userId) {
    return getRestoreUsers().users[userId] || null;
}

function upsertRestoreUser(user) {
    const data = getRestoreUsers();
    data.users[user.id] = {
        ...data.users[user.id],
        ...user,
        updatedAt: new Date().toISOString()
    };
    saveRestoreUsers(data);
    return data.users[user.id];
}

function countRestoreUsers() {
    return Object.keys(getRestoreUsers().users).length;
}

async function refreshAccessToken(user) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET');
    }

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: user.refreshToken
    });

    const response = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    if (!response.ok) {
        throw new Error(`Discord token refresh failed: ${response.status}`);
    }

    const token = await response.json();
    return upsertRestoreUser({
        ...user,
        accessToken: token.access_token,
        refreshToken: token.refresh_token || user.refreshToken,
        expiresAt: Date.now() + (token.expires_in * 1000)
    });
}

async function getValidRestoreUser(userId) {
    const user = getRestoreUser(userId);
    if (!user) return null;

    if (user.expiresAt && user.expiresAt > Date.now() + 60_000) {
        return user;
    }

    return refreshAccessToken(user);
}

async function restoreMemberToGuild(guildId, userId) {
    const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
    if (!token) throw new Error('Missing DISCORD_BOT_TOKEN');

    const user = await getValidRestoreUser(userId);
    if (!user) {
        return { ok: false, status: 404, message: 'Ten uzytkownik nie zapisal zgody restore.' };
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_token: user.accessToken })
    });

    if (response.ok) {
        return { ok: true, status: response.status, user };
    }

    const errorText = await response.text().catch(() => '');
    return {
        ok: false,
        status: response.status,
        message: errorText || response.statusText
    };
}

module.exports = {
    countRestoreUsers,
    getRestoreUsers,
    getRestoreUser,
    restoreMemberToGuild,
    upsertRestoreUser
};
