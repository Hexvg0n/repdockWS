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

async function fetchTracking(trackingNumber, language = 'pl') {
    try {
        const data = await postSiteJson('/api/tracking', {
            trackingNumber,
            language
        });

        return { ok: true, data };
    } catch (error) {
        return {
            ok: false,
            status: error.status,
            error: error.data?.error || error.message || 'Nie udalo sie sprawdzic tracking.'
        };
    }
}

function buildTrackingResponse(data) {
    const recentEvents = Array.isArray(data.details) ? data.details.slice(0, 8) : [];
    const embed = new EmbedBuilder()
        .setTitle('Tracking paczki')
        .setColor('#22d3ee')
        .setDescription([
            `Numer: **${data.trackingNumber || 'N/A'}**`,
            `Kraj: **${data.country || 'N/A'}**`,
            `Ostatni status: **${data.lastStatus || 'N/A'}**`
        ].join('\n'))
        .addFields(
            { name: 'Reference No.', value: data.referenceNo || 'N/A', inline: true },
            { name: 'Data', value: data.date || 'N/A', inline: true },
            { name: 'Odbiorca', value: data.consigneeName || 'N/A', inline: true }
        )
        .setFooter({ text: `Zrodlo: ${data.source || 'RepDock API'}` })
        .setTimestamp();

    for (const event of recentEvents) {
        embed.addFields({
            name: event.date || 'Brak daty',
            value: [`**${event.location || 'N/A'}**`, event.status || 'N/A'].join('\n').slice(0, 1024)
        });
    }

    const components = data.source ? [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Otworz tracking')
                .setStyle(ButtonStyle.Link)
                .setURL(data.source)
        )
    ] : [];

    return { embeds: [embed], components };
}

async function handleTrackingInteraction(interaction) {
    if (interaction.customId === 'tools_open_tracking' || interaction.customId === 'TrackingButton') {
        const modal = new ModalBuilder()
            .setCustomId('tools_tracking_modal')
            .setTitle('Tracking paczki');

        const trackingInput = new TextInputBuilder()
            .setCustomId('tracking_number_input')
            .setLabel('Numer sledzenia')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Wklej numer paczki')
            .setRequired(true);

        const langInput = new TextInputBuilder()
            .setCustomId('tracking_language_input')
            .setLabel('Jezyk odpowiedzi: pl albo en')
            .setStyle(TextInputStyle.Short)
            .setValue('pl')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(trackingInput),
            new ActionRowBuilder().addComponents(langInput)
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.customId !== 'tools_tracking_modal') return false;

    const trackingNumber = interaction.fields.getTextInputValue('tracking_number_input');
    const language = interaction.fields.getTextInputValue('tracking_language_input') || 'pl';
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await fetchTracking(trackingNumber, language.toLowerCase().trim());
    if (!result.ok) return interaction.editReply({ content: result.error });

    await interaction.editReply(buildTrackingResponse(result.data));
    return true;
}

module.exports = {
    fetchTracking,
    handleTrackingInteraction
};
