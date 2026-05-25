const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');

const VERIFY_BUTTON_ID = 'verify_member';

function getPublicBaseUrl() {
    return (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_URL || '').replace(/\/$/, '');
}

async function replyEphemeral(interaction, payload) {
    const response = typeof payload === 'string'
        ? { content: payload, flags: MessageFlags.Ephemeral }
        : { ...payload, flags: MessageFlags.Ephemeral };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response).catch(console.error);
        return;
    }

    await interaction.reply(response);
}

async function handleVerifyInteraction(interaction) {
    if (!interaction.isButton?.() || interaction.customId !== VERIFY_BUTTON_ID) {
        return false;
    }

    if (!interaction.inGuild()) {
        await replyEphemeral(interaction, 'Weryfikacja dziala tylko na serwerze.');
        return true;
    }

    const baseUrl = getPublicBaseUrl();
    if (!baseUrl) {
        await replyEphemeral(interaction, 'Weryfikacja nie jest skonfigurowana: brakuje PUBLIC_BASE_URL.');
        return true;
    }

    const guildId = process.env.RESTORE_GUILD_ID || process.env.DISCORD_GUILD_ID || interaction.guildId;
    const authorizeUrl = `${baseUrl}/api/restore/authorize?guild_id=${encodeURIComponent(guildId)}&mode=verify`;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Zweryfikuj przez Discord')
            .setStyle(ButtonStyle.Link)
            .setURL(authorizeUrl)
    );

    await replyEphemeral(interaction, {
        content: [
            'Kliknij przycisk ponizej, aby przejsc weryfikacje OAuth.',
            'Po autoryzacji zapiszemy zgode restore i nadamy role weryfikacji.'
        ].join('\n'),
        components: [row]
    });
    return true;
}

module.exports = { handleVerifyInteraction };
