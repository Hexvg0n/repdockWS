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
const { convertLink } = require('../utils/converter');

const MAX_URL_LENGTH = 4096;
const UPSTREAM_TIMEOUT_MS = 8_000;

const PLATFORM_CODES = {
    taobao: 'TB',
    tmall: 'TB',
    '1688': 'AL',
    weidian: 'WD'
};

const ITEM_ID_PATTERNS = {
    taobao: [/[?&]id=(\d+)/],
    tmall: [/[?&]id=(\d+)/],
    '1688': [/\/offer\/(\d+)\.html/],
    weidian: [/[?&]itemI[dD]=(\d+)/]
};

class UpstreamError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'UpstreamError';
        this.status = status;
    }
}

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
}

function normalizeImageUrl(value) {
    const raw = asString(value);
    if (!raw) return null;

    const candidate = raw.startsWith('//') ? `https:${raw}` : raw;

    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function extractItemId(url, platform) {
    for (const pattern of ITEM_ID_PATTERNS[platform] || []) {
        const match = url.match(pattern);
        if (match?.[1]) return match[1];
    }

    return null;
}

function parseProductUrl(inputUrl) {
    const converted = convertLink(inputUrl);
    const platform = converted.platform;
    const originalUrl = converted.originalUrl;

    if (!platform || !originalUrl || !PLATFORM_CODES[platform]) return null;

    const itemId = extractItemId(originalUrl, platform);
    if (!itemId) return null;

    return {
        platform,
        itemId,
        originalUrl,
        platformCode: PLATFORM_CODES[platform]
    };
}

function calculateSignature(params, body, secretKey) {
    const paramsToSign = {};

    for (const [key, value] of Object.entries(params)) {
        if (key !== 'signature') paramsToSign[key] = String(value);
    }

    paramsToSign.body = JSON.stringify(body);

    const stringToSign = Object.keys(paramsToSign)
        .sort()
        .map((key) => `${key}=${paramsToSign[key]}`)
        .join('&');

    return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

async function fetchJson(url, init = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...init,
            cache: 'no-store',
            signal: controller.signal
        });

        if (!response.ok) throw new UpstreamError(`Upstream returned HTTP ${response.status}`, response.status);

        try {
            return await response.json();
        } catch {
            throw new UpstreamError('Upstream returned invalid JSON', response.status);
        }
    } catch (error) {
        if (error instanceof UpstreamError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') throw new UpstreamError('Upstream request timed out');
        throw new UpstreamError(error instanceof Error ? error.message : 'Upstream request failed');
    } finally {
        clearTimeout(timeout);
    }
}

function okResult(images) {
    return { images, meta: { ok: true, count: images.length } };
}

function skippedResult(reason) {
    return { images: [], meta: { ok: false, skipped: true, count: 0, error: reason } };
}

function errorResult(error) {
    return {
        images: [],
        meta: {
            ok: false,
            count: 0,
            status: error instanceof UpstreamError ? error.status : undefined,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    };
}

async function fetchACBuyQC(productData) {
    const appId = process.env.ACBUY_APP_ID;
    const secretKey = process.env.ACBUY_SECRET_KEY;

    if (!appId || !secretKey) return skippedResult('ACBuy credentials are not configured');

    try {
        const goodsId = `${productData.platformCode}${productData.itemId}`;
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');
        const queryParams = { appId, nonce, timestamp };
        const body = { goodsId };
        const signature = calculateSignature(queryParams, body, secretKey);

        const targetUrl = new URL('https://openapi.acbuy.com/products/qc/list');
        targetUrl.searchParams.set('appId', appId);
        targetUrl.searchParams.set('nonce', nonce);
        targetUrl.searchParams.set('timestamp', String(timestamp));
        targetUrl.searchParams.set('signature', signature);

        const data = await fetchJson(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const rawItems = Array.isArray(data.data) ? data.data : [];
        const images = rawItems.flatMap((item) => {
            if (!isObject(item)) return [];
            const photoUrl = normalizeImageUrl(item.photoUrl ?? item.url ?? item.imgUrl);
            if (!photoUrl) return [];

            return [{
                photoUrl,
                createTime: asString(item.createTime ?? item.addTime),
                skuId: asString(item.skuId ?? item.skuName) ?? 'Inne',
                source: 'ACBuy'
            }];
        });

        return okResult(images);
    } catch (error) {
        console.error('ACBuy QC fetch failed:', error);
        return errorResult(error);
    }
}

async function fetchUSFansQC(productData) {
    try {
        const targetUrl = new URL('https://www.usfans.com/api/goods/estimate-info');
        targetUrl.searchParams.set('goodsId', productData.itemId);

        const data = await fetchJson(targetUrl, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        let rawItems = [];

        if (isObject(data) && isObject(data.data) && Array.isArray(data.data.qcImages)) {
            rawItems = data.data.qcImages;
        } else if (isObject(data) && Array.isArray(data.data)) {
            rawItems = data.data;
        } else if (Array.isArray(data)) {
            rawItems = data;
        }

        const images = rawItems.flatMap((item) => {
            if (typeof item === 'string') {
                const photoUrl = normalizeImageUrl(item);
                return photoUrl ? [{ photoUrl, createTime: null, skuId: 'USFans Stock', source: 'USFans' }] : [];
            }

            if (!isObject(item)) return [];

            const photoUrl = normalizeImageUrl(item.url ?? item.photoUrl ?? item.imgUrl);
            if (!photoUrl) return [];

            return [{
                photoUrl,
                createTime: asString(item.createTime ?? item.addTime),
                skuId: asString(item.skuId ?? item.skuName) ?? 'Inne',
                source: 'USFans'
            }];
        });

        return okResult(images);
    } catch (error) {
        console.error('USFans QC fetch failed:', error);
        return errorResult(error);
    }
}

async function fetchCNFansQC(productData) {
    try {
        const targetUrl = new URL('https://cnfans.com/wp-json/openapi/v1/product/detail');
        targetUrl.searchParams.set('skupid', productData.itemId);
        targetUrl.searchParams.set('site', 'cnfans');
        targetUrl.searchParams.set('lang', 'en');
        targetUrl.searchParams.set('wmc-currency', 'USD');

        const data = await fetchJson(targetUrl, {
            headers: {
                Accept: 'application/json',
                'From-Source-Type': 'PC',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const inboundDays = isObject(data)
            && data.code === 200
            && isObject(data.data)
            && Array.isArray(data.data.inboundDays)
            ? data.data.inboundDays
            : [];

        const images = inboundDays.flatMap((inbound) => {
            if (!isObject(inbound)) return [];
            const urls = Array.isArray(inbound.waterMarkImageUrlList) ? inbound.waterMarkImageUrlList : [];

            return urls.flatMap((url) => {
                const photoUrl = normalizeImageUrl(url);
                if (!photoUrl) return [];

                return [{
                    photoUrl,
                    createTime: asString(inbound.signedTime),
                    skuId: null,
                    source: 'CNFans'
                }];
            });
        });

        return okResult(images);
    } catch (error) {
        console.error('CNFans QC fetch failed:', error);
        return errorResult(error);
    }
}

function dedupeImages(images) {
    const seen = new Set();
    return images.filter((image) => {
        if (seen.has(image.photoUrl)) return false;
        seen.add(image.photoUrl);
        return true;
    });
}

async function fetchQC(inputUrl) {
    const trimmedUrl = String(inputUrl || '').trim();
    if (!trimmedUrl) return { ok: false, status: 400, error: 'URL nie moze byc pusty.' };
    if (trimmedUrl.length > MAX_URL_LENGTH) return { ok: false, status: 413, error: 'URL jest za dlugi.' };

    const product = parseProductUrl(trimmedUrl);
    if (!product) return { ok: false, status: 400, error: 'Nieobslugiwany link albo brak ID produktu.' };

    const [acbuy, usfans, cnfans] = await Promise.all([
        fetchACBuyQC(product),
        fetchUSFansQC(product),
        fetchCNFansQC(product)
    ]);

    const images = dedupeImages([...acbuy.images, ...usfans.images, ...cnfans.images]);
    const meta = {
        product,
        sources: { acbuy: acbuy.meta, usfans: usfans.meta, cnfans: cnfans.meta }
    };

    if (images.length === 0) {
        const anySourceWorked = [acbuy.meta, usfans.meta, cnfans.meta].some((source) => source.ok);
        return {
            ok: false,
            status: anySourceWorked ? 404 : 502,
            error: anySourceWorked ? 'Nie znaleziono zdjec QC dla tego produktu.' : 'Dostawcy QC sa aktualnie niedostepni.',
            meta
        };
    }

    return { ok: true, data: images, meta };
}

function buildSourceLine(name, meta) {
    if (meta.skipped) return `${name}: pominieto (${meta.error})`;
    if (!meta.ok) return `${name}: blad${meta.status ? ` ${meta.status}` : ''}`;
    return `${name}: ${meta.count}`;
}

function buildQcResponse(result) {
    const images = result.data;
    const product = result.meta.product;
    const shownImages = images.slice(0, 9);
    const sourceLines = [
        buildSourceLine('ACBuy', result.meta.sources.acbuy),
        buildSourceLine('USFans', result.meta.sources.usfans),
        buildSourceLine('CNFans', result.meta.sources.cnfans)
    ].join('\n');

    const embeds = [
        new EmbedBuilder()
            .setTitle('QC znalezione')
            .setURL(product.originalUrl)
            .setColor('#22d3ee')
            .setDescription([
                `Produkt: **${product.platform.toUpperCase()} ${product.itemId}**`,
                `Znaleziono zdjec: **${images.length}**`,
                '',
                sourceLines
            ].join('\n'))
    ];

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
    if (interaction.customId === 'tools_open_qc') {
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
