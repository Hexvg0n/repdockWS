const DEFAULT_SITE_API_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_TIMEOUT_MS = 12_000;

function getSiteApiBaseUrl() {
    const configured =
        process.env.BOT_SITE_API_BASE_URL ||
        process.env.REPDOCK_SITE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        DEFAULT_SITE_API_BASE_URL;

    return configured.replace(/\/+$/, '');
}

function getTimeoutMs() {
    const configured = Number(process.env.BOT_SITE_API_TIMEOUT_MS);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
}

async function postSiteJson(pathname, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
    const url = `${getSiteApiBaseUrl()}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        const text = await response.text();
        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = { error: text };
            }
        }

        if (!response.ok) {
            const error = new Error(data?.error || `API returned HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            const timeoutError = new Error('API request timed out');
            timeoutError.status = 504;
            throw timeoutError;
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    getSiteApiBaseUrl,
    postSiteJson
};
