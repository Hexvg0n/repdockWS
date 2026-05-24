const fs = require('fs');
const path = require('path');
const { REST, Routes, Events } = require('discord.js');
const { checkGiveaways } = require('../features/giveaways');
const Logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // Helper to log to debug file
        const logDebug = (msg) => {
            const timestamp = new Date().toISOString();
            fs.appendFileSync(path.join(__dirname, '../debug.log'), `[${timestamp}] ${msg}\n`);
        };

        Logger.success(`Logged in as ${client.user.tag} !`);
        logDebug(`Logged in as ${client.user.tag} !`);

        // Start Giveaway Loop
        setInterval(() => checkGiveaways(client), 5000); // Check every 5 seconds

        const TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        const commandsData = client.commands.map(c => c.data.toJSON());
        Logger.info(`Registering ${commandsData.length} commands...`);
        logDebug(`[INFO] Registering ${commandsData.length} commands: ${commandsData.map(c => c.name).join(', ')}`);

        try {
            Logger.info('Refreshing application (/) commands...');
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandsData },
            );
            Logger.success('Successfully reloaded application (/) commands.');
        } catch (error) {
            Logger.error('Failed to reload commands', error);
        }
    },
};
