const { MessageFlags, PermissionsBitField } = require('discord.js');
const { loadConfig } = require('../utils/config');

const VERIFY_BUTTON_ID = 'verify_member';

function getVerifyRoleId() {
    const config = loadConfig();

    return (
        process.env.DISCORD_VERIFY_ROLE_ID ||
        process.env.VERIFY_ROLE_ID ||
        config?.ids?.verifyRoleId ||
        config?.ids?.verifiedRoleId ||
        ''
    );
}

async function replyEphemeral(interaction, content) {
    const payload = { content, flags: MessageFlags.Ephemeral };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(console.error);
        return;
    }

    await interaction.reply(payload);
}

async function handleVerifyInteraction(interaction) {
    if (!interaction.isButton?.() || interaction.customId !== VERIFY_BUTTON_ID) {
        return false;
    }

    if (!interaction.inGuild()) {
        await replyEphemeral(interaction, 'Weryfikacja dziala tylko na serwerze.');
        return true;
    }

    const roleId = getVerifyRoleId();

    if (!roleId) {
        await replyEphemeral(interaction, 'Weryfikacja nie jest skonfigurowana: brakuje DISCORD_VERIFY_ROLE_ID.');
        return true;
    }

    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
        await replyEphemeral(interaction, 'Nie znaleziono roli weryfikacji. Sprawdz DISCORD_VERIFY_ROLE_ID.');
        return true;
    }

    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null);

    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        await replyEphemeral(interaction, 'Bot nie ma uprawnienia Manage Roles.');
        return true;
    }

    if (role.managed || botMember.roles.highest.comparePositionTo(role) <= 0) {
        await replyEphemeral(interaction, 'Bot nie moze nadac tej roli. Przenies role bota wyzej niz role weryfikacji.');
        return true;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member) {
        await replyEphemeral(interaction, 'Nie udalo sie pobrac Twojego profilu na serwerze.');
        return true;
    }

    if (member.roles.cache.has(roleId)) {
        await replyEphemeral(interaction, `Jestes juz zweryfikowany. Masz role ${role}.`);
        return true;
    }

    await member.roles.add(roleId, `Verification button used by ${interaction.user.tag}`);
    await replyEphemeral(interaction, `Zostales zweryfikowany. Nadano role ${role}.`);
    return true;
}

module.exports = { handleVerifyInteraction };
