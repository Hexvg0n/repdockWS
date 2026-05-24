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

const TRACKING_URLS = [
    'http://106.55.5.75:8082/en/trackIndex.htm',
    'http://114.132.51.252:8082/en/trackIndex.htm',
    'http://47.112.107.11:8082/en/trackIndex.htm',
    'http://39.101.71.24:8082/en/trackIndex.htm',
    'http://120.78.2.65:8082/en/trackIndex.htm',
    'http://www.hsd-ex.com:8082/trackIndex.htm',
    'http://www.gdasgyl.com:8082/en/trackIndex.htm',
    'http://120.24.176.176:8082/en/trackIndex.htm',
    'http://111.230.211.49:8082/trackIndex.htm',
    'http://111.230.15.119:8082/trackIndex.htm',
    'http://120.77.221.225:8082/trackIndex.htm',
    'http://49.234.188.236:8082/trackIndex.htm',
    'http://115.29.184.71:8082/trackIndex.htm'
];

const LABEL_NORMALIZATION = {
    'tracking number': 'trackingNumber',
    'numer sledzenia': 'trackingNumber',
    'reference no.': 'referenceNo',
    'numer referencyjny': 'referenceNo',
    country: 'country',
    kraj: 'country',
    date: 'date',
    data: 'date',
    'the last record': 'lastStatus',
    'ostatni status': 'lastStatus',
    consigneename: 'consigneeName',
    odbiorca: 'consigneeName'
};

const MAX_TRACKING_LENGTH = 64;
const UPSTREAM_TIMEOUT_MS = 4_500;
const CACHE_TTL_MS = 120_000;
const cache = new Map();

function normalizeLabel(label) {
    return LABEL_NORMALIZATION[label.toLowerCase().trim()] || label.trim();
}

function decodeEntities(value) {
    return String(value || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function stripTags(value) {
    return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' '));
}

function extractItems(block, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
    return [...String(block || '').matchAll(regex)].map((match) => stripTags(match[1])).filter(Boolean);
}

function parseTrackingHtml(html, source) {
    const menu = html.match(/<div[^>]*class=["'][^"']*menu_[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
    const uls = [...menu.matchAll(/<ul[^>]*>([\s\S]*?)<\/ul>/gi)].map((match) => match[1]);
    const labels = extractItems(uls[0] || '', 'li');
    const values = extractItems(uls[1] || '', 'li');
    const mainInfo = {};

    labels.forEach((label, index) => {
        mainInfo[normalizeLabel(label)] = values[index] || '';
    });

    if (!mainInfo.trackingNumber) return null;

    const details = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((row) => {
        const cells = extractItems(row[1], 'td');
        if (cells.length !== 3) return [];

        return [{
            date: cells[0],
            location: cells[1],
            status: cells[2],
            icon: ''
        }];
    });

    return {
        trackingNumber: mainInfo.trackingNumber,
        referenceNo: mainInfo.referenceNo || 'N/A',
        country: mainInfo.country || 'N/A',
        date: mainInfo.date || 'N/A',
        lastStatus: mainInfo.lastStatus || 'N/A',
        consigneeName: mainInfo.consigneeName || 'N/A',
        details,
        source
    };
}

function isValidTrackingNumber(value) {
    const clean = String(value || '').replace(/\s/g, '');
    return clean.length > 0 && clean.length <= MAX_TRACKING_LENGTH && /^[a-z0-9-]+$/i.test(clean);
}

async function translateTexts(texts, targetLang) {
    const apiKey = process.env.DEEPL_API_KEY;
    const cleanTexts = texts.map((text) => String(text || '').trim());
    if (!apiKey || targetLang === 'EN') return cleanTexts;

    const unique = [...new Set(cleanTexts.filter(Boolean))];
    if (unique.length === 0) return cleanTexts;

    try {
        const body = new URLSearchParams();
        unique.forEach((text) => body.append('text', text));
        body.set('target_lang', targetLang);

        const response = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: {
                Authorization: `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        });

        if (!response.ok) return cleanTexts;

        const data = await response.json();
        const translated = new Map();
        data.translations?.forEach((item, index) => translated.set(unique[index], item.text));
        return cleanTexts.map((text) => translated.get(text) || text);
    } catch (error) {
        console.error('DeepL tracking translation failed:', error);
        return cleanTexts;
    }
}

async function applyTranslations(result, targetLang) {
    const statuses = [result.lastStatus, ...result.details.map((event) => event.status)];
    const translated = await translateTexts(statuses, targetLang);

    return {
        ...result,
        lastStatus: translated[0] || result.lastStatus,
        details: result.details.map((event, index) => ({
            ...event,
            status: translated[index + 1] || event.status
        }))
    };
}

async function checkTrackingUrl(url, trackingNumber, signal) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    const abortFromParent = () => controller.abort();
    signal?.addEventListener('abort', abortFromParent, { once: true });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ documentCode: trackingNumber }),
            signal: controller.signal
        });

        if (!response.ok) return null;

        const html = await response.text();
        return parseTrackingHtml(html, url);
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abortFromParent);
    }
}

async function firstValidTrackingResult(trackingNumber) {
    const controller = new AbortController();
    let pending = TRACKING_URLS.length;

    return new Promise((resolve) => {
        for (const url of TRACKING_URLS) {
            checkTrackingUrl(url, trackingNumber, controller.signal)
                .then((result) => {
                    if (result) {
                        controller.abort();
                        resolve(result);
                        return;
                    }

                    pending -= 1;
                    if (pending === 0) resolve(null);
                })
                .catch(() => {
                    pending -= 1;
                    if (pending === 0) resolve(null);
                });
        }
    });
}

async function fetchTracking(trackingNumber, language = 'pl') {
    const cleanTrackingNumber = String(trackingNumber || '').replace(/\s/g, '').trim();
    if (!isValidTrackingNumber(cleanTrackingNumber)) {
        return { ok: false, status: 400, error: 'Nieprawidlowy numer sledzenia.' };
    }

    const targetLang = language === 'en' ? 'EN' : 'PL';
    const cacheKey = `${targetLang}:${cleanTrackingNumber.toUpperCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const rawResult = await firstValidTrackingResult(cleanTrackingNumber);
    if (!rawResult) {
        return {
            ok: false,
            status: 404,
            error: 'Nie znaleziono danych sledzenia. Sprawdz, czy numer jest prawidlowy.'
        };
    }

    const result = { ok: true, data: await applyTranslations(rawResult, targetLang) };
    cache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
}

function buildTrackingResponse(data) {
    const recentEvents = data.details.slice(0, 8);
    const embed = new EmbedBuilder()
        .setTitle('Tracking paczki')
        .setColor('#22d3ee')
        .setDescription([
            `Numer: **${data.trackingNumber}**`,
            `Kraj: **${data.country}**`,
            `Ostatni status: **${data.lastStatus}**`
        ].join('\n'))
        .addFields(
            { name: 'Reference No.', value: data.referenceNo || 'N/A', inline: true },
            { name: 'Data', value: data.date || 'N/A', inline: true },
            { name: 'Odbiorca', value: data.consigneeName || 'N/A', inline: true }
        )
        .setFooter({ text: `Zrodlo: ${data.source}` })
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
    if (interaction.customId === 'tools_open_tracking') {
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
