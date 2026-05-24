const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { convertLink, getConverterAgents } = require('../utils/converter');

function chunk(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
    return chunks;
}

function buildLinkRows(convertedLinks) {
    return chunk(convertedLinks.slice(0, 25), 5).map((links) => (
        new ActionRowBuilder().addComponents(
            links.map((link) => new ButtonBuilder()
                .setLabel(link.name.slice(0, 80))
                .setStyle(ButtonStyle.Link)
                .setURL(link.url))
        )
    ));
}

async function handleLinkConverter(interaction) {
    if (interaction.customId === 'tools_open_link') {
        const modal = new ModalBuilder()
            .setCustomId('tools_link_modal')
            .setTitle('Link Converter');

        const input = new TextInputBuilder()
            .setCustomId('link_input')
            .setLabel('Wklej link produktu')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://weidian.com/item.html?itemID=...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return true;
    }

    if (interaction.customId !== 'tools_link_modal') return false;

    const url = interaction.fields.getTextInputValue('link_input');
    const converted = convertLink(url);

    if (!converted.originalUrl || !converted.platform || converted.convertedLinks.length === 0) {
        return interaction.reply({
            content: 'Nie udalo sie rozpoznac linku. Upewnij sie, ze format jest obslugiwany.',
            flags: MessageFlags.Ephemeral
        });
    }

    const agents = getConverterAgents().map((agent) => agent.name).join(', ');
    const embed = new EmbedBuilder()
        .setTitle('Konwersja gotowa')
        .setColor('#57f287')
        .setDescription([
            `Platforma: **${converted.platform.toUpperCase()}**`,
            `[Otworz oryginalny link](${converted.originalUrl})`,
            '',
            `Dostepni agenci: ${agents}`
        ].join('\n'))
        .setFooter({ text: `Wygenerowano ${converted.convertedLinks.length} linkow agentow` });

    await interaction.reply({
        embeds: [embed],
        components: buildLinkRows(converted.convertedLinks),
        flags: MessageFlags.Ephemeral
    });
    return true;
}

module.exports = { handleLinkConverter };
