const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Panel konfiguracyjny bota (Tylko dla Administratorów)'),
    async execute(interaction) {
        // Check for Administrator permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Nie masz uprawnień do używania tej komendy.', flags: MessageFlags.Ephemeral });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('setup_select_action')
                    .setPlaceholder('Wybierz co chcesz skonfigurować')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('System Ticketów')
                            .setDescription('Wyślij panel ticketów na kanał')
                            .setValue('setup_tickets')
                            .setEmoji('🎫'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Narzędzia')
                            .setDescription('Panel narzędzi (Link Converter, QC)')
                            .setValue('setup_tools')
                            .setEmoji('🛠️')
                    )
            );

        await interaction.reply({ content: 'Panel Konfiguracyjny:', components: [row], flags: MessageFlags.Ephemeral });
    },
};
