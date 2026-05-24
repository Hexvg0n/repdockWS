const { handleTicketInteraction } = require('../features/tickets');
const { handleJoinGiveaway } = require('../features/giveaways');
const { handleToolsInteraction } = require('../features/tools');
const { handleLinkConverter } = require('../features/linkConverter');
const { handleQcInteraction } = require('../features/qc');
const { handleTrackingInteraction } = require('../features/tracking');
const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;

        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                await command.execute(interaction);
                return;
            }

            if (interaction.customId === 'giveaway_join') {
                await handleJoinGiveaway(interaction);
                return;
            }

            const handlers = [
                () => handleTicketInteraction(interaction, client),
                () => handleQcInteraction(interaction),
                () => handleTrackingInteraction(interaction),
                () => handleToolsInteraction(interaction),
                () => handleLinkConverter(interaction)
            ];

            for (const handle of handlers) {
                if (await handle()) return;
            }
        } catch (error) {
            console.error(error);

            const payload = { content: 'There was an error while handling this interaction.', flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload).catch(console.error);
            } else {
                await interaction.reply(payload).catch(console.error);
            }
        }
    },
};
