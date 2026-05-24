const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error("Error: DISCORD_BOT_TOKEN is not set in .env.local");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Load Commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const Logger = require('./utils/logger');

// Debug helper
function logDebug(msg) {
    // Keep file logging but silence console debug doubles if wanted
    // For now we will rely on our new Logger for console
    const timestamp = new Date().toISOString();
    fs.appendFileSync(path.join(__dirname, 'debug.log'), `[${timestamp}] ${msg}\n`);
}

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            Logger.cmd(`Loaded command: ${command.data.name}`);
            logDebug(`[INFO] Loaded command: ${command.data.name} from ${file}`);
        } else {
            Logger.warn(`Command at ${filePath} is missing "data" or "execute".`);
            logDebug(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    } catch (e) {
        Logger.error(`Failed to load command ${file}`, e);
        logDebug(`[ERROR] Failed to load command ${file}: ${e}`);
    }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(TOKEN);
