const crypto = require('crypto');
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

const qcSessions = new Map();
const QC_SESSION_TTL_MS = 10 * 60 * 1000;

function cleanupQcSessions() {
    const now = Date.now();
    for (const [id, session] of qcSessions.entries()) {
        if (session.expiresAt <= now) {
            qcSessions.delete(id);
        }
    }
}

function createQcSession(userId, result) {
    cleanupQcSessions();
    const id = crypto.randomBytes(8).toString('hex');
    qcSessions.set(id, {
        createdAt: Date.now(),
        expiresAt: Date.now() + QC_SESSION_TTL_MS,
        result,
        userId
    });
    return id;
}

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

function buildSourceSummary(sources = {}) {
    return [
        sources.acbuy?.ok ? `ACBuy ${sources.acbuy.count}` : null,
        sources.usfans?.ok ? `USFans ${sources.usfans.count}` : null,
        sources.cnfans?.ok ? `CNFans ${sources.cnfans.count}` : null
    ].filter(Boolean).join(' / ') || 'Brak danych o zrodlach';
}

function buildQcResponse(result, sessionId, index = 0) {
    const images = result.data;
    const product = result.meta?.product || {};
    const sources = result.meta?.sources || {};
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    const image = images[safeIndex];
    const productLabel = product.platform && product.itemId
        ? `${String(product.platform).toUpperCase()} ${product.itemId}`
        : 'Produkt rozpoznany przez API strony';

    const embed = new EmbedBuilder()
        .setTitle(`${image.source}${image.skuId ? ` - ${image.skuId}` : ''}`)
        .setColor('#22d3ee')
        .setDescription([
            productLabel,
            `Zdjecie ${safeIndex + 1} z ${images.length}`,
            buildSourceSummary(sources)
        ].join('\n'))
        .setImage(image.photoUrl)
        .setFooter({ text: 'Uzyj przyciskow, zeby przewijac QC.' });

    if (product.originalUrl) {
        embed.setURL(product.originalUrl);
    }

    const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`qc_prev:${sessionId}:${safeIndex}`)
            .setLabel('Poprzednie')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(images.length <= 1),
        new ButtonBuilder()
            .setCustomId(`qc_next:${sessionId}:${safeIndex}`)
            .setLabel('Nastepne')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(images.length <= 1),
        new ButtonBuilder()
            .setLabel('Otworz zdjecie')
            .setStyle(ButtonStyle.Link)
            .setURL(image.photoUrl)
    );

    return { embeds: [embed], components: [controls] };
}

function buildLoadingResponse() {
    return {
        embeds: [
            new EmbedBuilder()
                .setTitle('Szukam QC')
                .setColor('#22d3ee')
                .setDescription('Pobieram zdjecia z API RepDock. Discord moze chwilowo pokazac puste miejsce, dopoki zaladuje obrazek.')
        ],
        components: []
    };
}

async function handleQcInteraction(interaction) {
    if (interaction.customId?.startsWith('qc_prev:') || interaction.customId?.startsWith('qc_next:')) {
        const [action, sessionId, rawIndex] = interaction.customId.split(':');
        const session = qcSessions.get(sessionId);

        if (!session || session.expiresAt <= Date.now()) {
            qcSessions.delete(sessionId);
            await interaction.reply({ content: 'Ta sesja QC wygasla. Wyszukaj QC ponownie.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (session.userId !== interaction.user.id) {
            await interaction.reply({ content: 'To nie jest Twoja sesja QC.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const currentIndex = Number(rawIndex);
        const count = session.result.data.length;
        const nextIndex = action === 'qc_prev'
            ? (Number.isFinite(currentIndex) ? currentIndex - 1 + count : count - 1) % count
            : (Number.isFinite(currentIndex) ? currentIndex + 1 : 1) % count;

        session.expiresAt = Date.now() + QC_SESSION_TTL_MS;
        await interaction.update(buildQcResponse(session.result, sessionId, nextIndex));
        return true;
    }

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
    await interaction.editReply(buildLoadingResponse());

    const result = await fetchQC(url);
    if (!result.ok) {
        return interaction.editReply({ content: `Nie udalo sie pobrac QC: ${result.error}` });
    }

    const sessionId = createQcSession(interaction.user.id, result);
    const response = buildQcResponse(result, sessionId, 0);
    await interaction.editReply(response);
    return true;
}

module.exports = {
    fetchQC,
    handleQcInteraction
};
