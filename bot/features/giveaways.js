const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { readJson, writeJsonAtomic } = require('../utils/jsonStore');

const dbPath = path.join(__dirname, '../giveaways.json');

// --- Helper Functions ---
function getAllGiveaways() {
    const giveaways = readJson(dbPath, []);
    return Array.isArray(giveaways) ? giveaways : [];
}

function saveGiveaways(giveaways) {
    try {
        writeJsonAtomic(dbPath, giveaways);
    } catch (e) {
        console.error("Error saving giveaways:", e);
    }
}

function parseDuration(durationStr) {
    const regex = /^(\d+)([dhms])$/;
    const match = durationStr.match(regex);
    if (!match) return null;

    const value = Number.parseInt(match[1], 10);
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    const unit = match[2];

    let ms = 0;
    switch (unit) {
        case 's': ms = value * 1000; break;
        case 'm': ms = value * 60 * 1000; break;
        case 'h': ms = value * 60 * 60 * 1000; break;
        case 'd': ms = value * 24 * 60 * 60 * 1000; break;
    }
    return ms;
}

// --- Main Feature Logic ---

async function startGiveaway(interaction, prize, durationStr, winnerCount, channel) {
    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
        return interaction.reply({ content: 'Niepoprawny format czasu! Użyj np. 10m, 1h, 2d.', flags: MessageFlags.Ephemeral });
    }

    if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 25) {
        return interaction.reply({ content: 'Liczba zwyciezcow musi byc od 1 do 25.', flags: MessageFlags.Ephemeral });
    }

    const endTime = Date.now() + durationMs;
    const endTimestamp = Math.floor(endTime / 1000);

    const embed = new EmbedBuilder()
        .setTitle('🎉 KONKURS! 🎉')
        .setDescription(`Nagroda: **${prize}**\n\nKliknij przycisk poniżej, aby dołączyć!\n\nZwycięzców: **${winnerCount}**\nKoniec: <t:${endTimestamp}:R>`)
        .setColor('#FF0000')
        .setTimestamp(endTime);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('Dołącz')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎉')
        );

    const message = await channel.send({ embeds: [embed], components: [row] });

    const newGiveaway = {
        messageId: message.id,
        channelId: channel.id,
        guildId: interaction.guildId,
        prize: prize,
        endTime: endTime,
        winnerCount,
        participants: [],
        ended: false,
        hostId: interaction.user.id
    };

    const giveaways = getAllGiveaways();
    giveaways.push(newGiveaway);
    saveGiveaways(giveaways);

    await interaction.reply({ content: `Konkurs utworzony na kanale ${channel}!`, flags: MessageFlags.Ephemeral });
}

async function handleJoinGiveaway(interaction) {
    const giveaways = getAllGiveaways();
    const giveaway = giveaways.find(g => g.messageId === interaction.message.id);

    if (!giveaway) {
        return interaction.reply({ content: 'Ten konkurs już nie istnieje w bazie danych.', flags: MessageFlags.Ephemeral });
    }

    if (giveaway.ended) {
        return interaction.reply({ content: 'Ten konkurs już się zakończył.', flags: MessageFlags.Ephemeral });
    }

    if (giveaway.participants.includes(interaction.user.id)) {
        return interaction.reply({ content: 'Już bierzesz udział w tym konkursie!', flags: MessageFlags.Ephemeral });
    }

    giveaway.participants.push(interaction.user.id);
    saveGiveaways(giveaways);

    return interaction.reply({ content: 'Dołączyłeś do konkursu! Powodzenia! 🍀', flags: MessageFlags.Ephemeral });
}

async function endGiveaway(client, messageId) {
    const giveaways = getAllGiveaways();
    const giveaway = giveaways.find(g => g.messageId === messageId);
    if (!giveaway || giveaway.ended) return;

    giveaway.ended = true;
    saveGiveaways(giveaways);

    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);

        if (giveaway.participants.length < giveaway.winnerCount) {
            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed)
                .setDescription(`Nagroda: **${giveaway.prize}**\n\nKoniec konkursu!\nBrak wystarczającej liczby uczestników by wyłonić zwycięzców.`)
                .setColor('#000000');

            await message.edit({ embeds: [newEmbed], components: [] });
            await channel.send(`Konkurs na **${giveaway.prize}** zakończony. Brak zwycięzców.`);
            return;
        }

        const winners = [];
        const pool = [...giveaway.participants];

        for (let i = 0; i < giveaway.winnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            winners.push(pool[randomIndex]);
            pool.splice(randomIndex, 1);
        }

        const winnersString = winners.map(id => `<@${id}>`).join(', ');

        const embed = message.embeds[0];
        const newEmbed = EmbedBuilder.from(embed)
            .setDescription(`Nagroda: **${giveaway.prize}**\n\nZwycięzcy: ${winnersString}!\nGratulacje!`)
            .setColor('#00FF00');

        await message.edit({ embeds: [newEmbed], components: [] });
        await channel.send(`Gratulacje ${winnersString}! Wygraliście **${giveaway.prize}**!`);

    } catch (e) {
        console.error("Error ending giveaway:", e);
    }
}

async function checkGiveaways(client) {
    const giveaways = getAllGiveaways();
    const now = Date.now();

    for (const giveaway of giveaways) {
        if (!giveaway.ended && giveaway.endTime <= now) {
            await endGiveaway(client, giveaway.messageId);
        }
    }
}

async function rerollGiveaway(client, messageId, channelId) {
    const giveaways = getAllGiveaways();
    const giveaway = giveaways.find(g => g.messageId === messageId);

    if (!giveaway) return "Nie znaleziono konkursu.";
    if (!giveaway.ended) return "Konkurs jeszcze się nie zakończył.";
    if (giveaway.participants.length === 0) return "Brak uczestników do wylosowania.";

    // Simple single winner reroll logic for now
    const winnerId = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];

    try {
        const channel = await client.channels.fetch(channelId);
        await channel.send(`🎉 Nowy zwycięzca konkursu na **${giveaway.prize}**: <@${winnerId}>!`);
        return "Pomyślnie wylosowano nowego zwycięzcę.";
    } catch (e) {
        console.error(e);
        return "Błąd podczas wysyłania wiadomości (np. kanał usunięty).";
    }
}

module.exports = { startGiveaway, handleJoinGiveaway, checkGiveaways, rerollGiveaway, endGiveaway };
