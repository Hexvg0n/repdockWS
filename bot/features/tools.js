const { MessageFlags } = require('discord.js');

const TOOLS_PANEL_COMPONENTS = [
    {
        type: 17,
        accent_color: 8900331,
        components: [
            {
                type: 10,
                content: '# <:mapp:1460396801260523726> × TOOLS!'
            },
            {
                type: 14,
                divider: true,
                spacing: 1
            },
            {
                type: 9,
                components: [
                    {
                        type: 10,
                        content: '> <:602327arrow:1460390014620930129> Konwertuj linki agentow na oryginalne i odwrotnie.'
                    }
                ],
                accessory: {
                    type: 2,
                    style: 2,
                    label: 'Konwertuj link',
                    custom_id: 'tools_open_link'
                }
            },
            {
                type: 14,
                divider: false,
                spacing: 1
            },
            {
                type: 9,
                components: [
                    {
                        type: 10,
                        content: '> <:602327arrow:1460390014620930129> Sprawdz zdjecia QC produktu.'
                    }
                ],
                accessory: {
                    type: 2,
                    style: 2,
                    label: 'Sprawdz QC',
                    custom_id: 'tools_open_qc'
                }
            },
            {
                type: 14,
                divider: false,
                spacing: 1
            },
            {
                type: 9,
                components: [
                    {
                        type: 10,
                        content: '> <:602327arrow:1460390014620930129> Uzyj komendy `/tracking` lub kliknij przycisk, aby sprawdzic status swojej paczki.'
                    }
                ],
                accessory: {
                    type: 2,
                    style: 2,
                    label: 'Sprawdz paczke',
                    emoji: {
                        id: '1460396801260523726',
                        name: 'mapp'
                    },
                    custom_id: 'tools_open_tracking'
                }
            }
        ]
    }
];

async function handleToolsInteraction(interaction) {
    const { customId, channel } = interaction;

    if (customId !== 'setup_select_action' || !interaction.isStringSelectMenu()) {
        return false;
    }

    const selected = interaction.values[0];
    if (selected !== 'setup_tools') {
        return false;
    }

    await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: TOOLS_PANEL_COMPONENTS
    });
    await interaction.reply({ content: 'Panel narzedzi zostal wyslany!', flags: MessageFlags.Ephemeral });
    return true;
}

module.exports = { handleToolsInteraction };
