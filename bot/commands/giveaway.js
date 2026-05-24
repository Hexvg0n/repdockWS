const { SlashCommandBuilder, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
const { startGiveaway, rerollGiveaway, endGiveaway } = require('../features/giveaways');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Zarządzanie konkursami')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Utwórz nowy konkurs')
                .addStringOption(option => option.setName('prize').setDescription('Nagroda').setRequired(true))
                .addStringOption(option => option.setName('duration').setDescription('Czas trwania (np. 10m, 1h, 2d)').setRequired(true))
                .addIntegerOption(option => option.setName('winners').setDescription('Liczba zwycięzców').setRequired(true).setMinValue(1).setMaxValue(25))
                .addChannelOption(option => option.setName('channel').setDescription('Kanał konkursu').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Zakończ konkurs ręcznie')
                .addStringOption(option => option.setName('message_id').setDescription('ID wiadomości konkursu').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Wylosuj nowego zwycięzcę')
                .addStringOption(option => option.setName('message_id').setDescription('ID wiadomości konkursu').setRequired(true))
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'Nie masz uprawnień do zarządzania konkursami.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const prize = interaction.options.getString('prize');
            const duration = interaction.options.getString('duration');
            const winners = interaction.options.getInteger('winners');
            const channel = interaction.options.getChannel('channel') || interaction.channel;

            await startGiveaway(interaction, prize, duration, winners, channel);
        }
        else if (subcommand === 'end') {
            const messageId = interaction.options.getString('message_id');
            await endGiveaway(interaction.client, messageId);
            await interaction.reply({ content: 'Próba zakończenia konkursu.', flags: MessageFlags.Ephemeral });
        }
        else if (subcommand === 'reroll') {
            const messageId = interaction.options.getString('message_id');
            const resultMsg = await rerollGiveaway(interaction.client, messageId, interaction.channelId);
            await interaction.reply({ content: resultMsg, flags: MessageFlags.Ephemeral });
        }
    },
};
