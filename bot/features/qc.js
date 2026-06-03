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

async function fetchQC(inputUrl) {
    try {
        const response = await postSiteJson('/api/qc', { url: inputUrl });

        if (!Array.isArray(response.data)) {
            return { ok: false, status: 502, error: 'API QC zwrocilo nieprawidlowa odpowiedz.' };
        }

        return {
            ok: true,
            data: response.data,
            meta: response.meta || {}
        };
    } catch (error) {
        return {
            ok: false,
            status: error.status,
            error: error.data?.error || error.message || 'Nie udalo sie pobrac QC.',
            meta: error.data?.meta
        };
    }
}

function buildSourceLine(name, meta) {
    if (!meta) return `${name}: brak danych`;
    if (meta.skipped) return `${name}: pominieto (${meta.error})`;
    if (!meta.ok) return `${name}: blad${meta.status ? ` ${meta.status}` : ''}`;
    return `${name}: ${meta.count}`;
}

function buildQcResponse(result) {
    const images = result.data;
    const product = result.meta?.product || {};
    const sources = result.meta?.sources || {};
    const shownImages = images.slice(0, 9);
    const sourceLines = [
        buildSourceLine('ACBuy', sources.acbuy),
        buildSourceLine('USFans', sources.usfans),
        buildSourceLine('CNFans', sources.cnfans)
    ].join('\n');

    const summary = new EmbedBuilder()
        .setTitle('QC znalezione')
        .setColor('#22d3ee')
        .setDescription([
            product.platform && product.itemId
                ? `Produkt: **${String(product.platform).toUpperCase()} ${product.itemId}**`
                : 'Produkt: **rozpoznany przez API strony**',
            `Znaleziono zdjec: **${images.length}**`,
            '',
            sourceLines
        ].join('\n'));

    if (product.originalUrl) {
        summary.setURL(product.originalUrl);
    }

    const embeds = [summary];

    for (const image of shownImages) {
        embeds.push(
            new EmbedBuilder()
                .setColor('#22d3ee')
                .setTitle(`${image.source}${image.skuId ? ` - ${image.skuId}` : ''}`)
                .setURL(image.photoUrl)
                .setImage(image.photoUrl)
        );
    }

    const rows = [];
    const firstLinks = images.slice(0, 5);
    if (firstLinks.length > 0) {
        rows.push(
            new ActionRowBuilder().addComponents(
                firstLinks.map((image, index) => new ButtonBuilder()
                    .setLabel(`${image.source} ${index + 1}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(image.photoUrl))
            )
        );
    }

    return { embeds, components: rows };
}

async function handleQcInteraction(interaction) {
    if (interaction.customId === 'tools_open_qc' || interaction.customId === 'QCButton') {
        const modal = new ModalBuilder()
            .setCustomId('tools_qc_modal')
            .setTitle('QC Checker');

        const input = new TextInputBuilder()
            .setCustomId('qc_url_input')
            .setLabel('Wklej link produktu')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://weidian.com/item.html?itemID=...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return true;
    }

    if (interaction.customId !== 'tools_qc_modal') return false;

    const url = interaction.fields.getTextInputValue('qc_url_input');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await fetchQC(url);
    if (!result.ok) {
        return interaction.editReply({ content: `Nie udalo sie pobrac QC: ${result.error}` });
    }

    const response = buildQcResponse(result);
    await interaction.editReply(response);
    return true;
}

module.exports = {
    fetchQC,
    handleQcInteraction
};
