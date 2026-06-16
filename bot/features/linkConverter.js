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
const { postSiteJson } = require('../utils/siteApi');

async function handleLinkConverter(interaction) {
    if (interaction.customId === 'tools_open_link' || interaction.customId === 'ConverterButton') {
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
    let converted;

    try {
        converted = await postSiteJson('/api/converter', { url });
    } catch (error) {
        return interaction.reply({
            content: `Nie udalo sie polaczyc z API convertera: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }

    if (!converted.originalUrl || !converted.platform || !Array.isArray(converted.convertedLinks) || converted.convertedLinks.length === 0) {
        return interaction.reply({
            content: 'Nie udalo sie rozpoznac linku. Upewnij sie, ze format jest obslugiwany.',
            flags: MessageFlags.Ephemeral
        });
    }

    const boonbuyLink = converted.convertedLinks.find((link) =>
        link.key === 'boonbuy' || String(link.name || '').toLowerCase().includes('boon')
    );

    if (!boonbuyLink?.url) {
        return interaction.reply({
            content: 'Nie udalo sie wygenerowac linku BoonBuy dla tego produktu.',
            flags: MessageFlags.Ephemeral
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('Link BoonBuy')
        .setColor('#57f287')
        .setDescription([
            `Platforma: ${converted.platform.toUpperCase()}`,
            `[Otworz produkt w BoonBuy](${boonbuyLink.url})`
        ].join('\n'));

    await interaction.reply({
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('BoonBuy')
                        .setStyle(ButtonStyle.Link)
                        .setURL(boonbuyLink.url)
            )
        ],
        flags: MessageFlags.Ephemeral
    });
    return true;
}

module.exports = { handleLinkConverter };
