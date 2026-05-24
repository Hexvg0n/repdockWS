const {
    SlashCommandBuilder,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');
const { countRestoreUsers, restoreMemberToGuild } = require('../utils/restoreStore');

function getPublicBaseUrl() {
    return (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restore')
        .setDescription('System opt-in restore czlonkow serwera')
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Wyslij panel zapisu do restore')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Pokaz liczbe zapisanych zgod restore')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('member')
                .setDescription('Przywroc pojedynczego uzytkownika po ID')
                .addStringOption(option => option.setName('user_id').setDescription('ID uzytkownika Discord').setRequired(true))
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Nie masz uprawnien do systemu restore.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'panel') {
            const baseUrl = getPublicBaseUrl();
            if (!baseUrl) {
                return interaction.reply({
                    content: 'Brakuje PUBLIC_BASE_URL w .env.local, np. https://twoja-domena.pl',
                    flags: MessageFlags.Ephemeral
                });
            }

            const guildId = process.env.RESTORE_GUILD_ID || process.env.DISCORD_GUILD_ID || interaction.guildId;
            const authorizeUrl = `${baseUrl}/api/restore/authorize?guild_id=${encodeURIComponent(guildId)}`;

            const embed = new EmbedBuilder()
                .setColor('#22d3ee')
                .setTitle('Restore Access')
                .setDescription([
                    'Zapisz zgode, aby administracja mogla przywrocic Cie na serwer, jesli kiedys utracisz dostep.',
                    '',
                    'Klikniecie przycisku przekieruje Cie do Discord OAuth2. Zgoda jest dobrowolna.'
                ].join('\n'));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Zapisz restore')
                    .setStyle(ButtonStyle.Link)
                    .setURL(authorizeUrl)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: 'Panel restore zostal wyslany.', flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'stats') {
            return interaction.reply({
                content: `Zapisane zgody restore: ${countRestoreUsers()}`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcommand === 'member') {
            const guildId = process.env.RESTORE_GUILD_ID || process.env.DISCORD_GUILD_ID || interaction.guildId;
            const userId = interaction.options.getString('user_id');

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const result = await restoreMemberToGuild(guildId, userId);

            if (result.ok) {
                return interaction.editReply({ content: `Restore wykonany dla <@${userId}>.` });
            }

            return interaction.editReply({ content: `Restore nieudany (${result.status}): ${result.message}` });
        }
    },
};
