const {
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
    const recentEvents = Array.isArray(data.details) ? data.details.slice(0, 6) : [];
    const details = [
        `Numer: ${data.trackingNumber || 'N/A'}`,
        `Kraj: ${data.country || 'N/A'}`,
        `Reference: ${data.referenceNo || 'N/A'}`,
        `Odbiorca: ${data.consigneeName || 'N/A'}`
    ].join('\n');
    const embed = new EmbedBuilder()
        .setTitle('Status paczki')
        .setColor('#22d3ee')
        .setDescription(data.lastStatus || 'N/A')
        .addFields(
            { name: 'Dane przesylki', value: details.slice(0, 1024), inline: false }
        );

    for (const event of recentEvents) {
        const name = String(event.status || 'Status').slice(0, 256);
        const value = [
            event.location ? `Miejsce: ${event.location}` : null,
            event.date ? `Data: ${event.date}` : null
        ].filter(Boolean).join('\n') || 'Brak dodatkowych danych';

        embed.addFields({
            name,
            value: value.slice(0, 1024),
            inline: false
        });
    }

    return { embeds: [embed], components: [] };
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
