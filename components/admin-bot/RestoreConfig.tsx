import {
    AlertTriangle,
    CheckCircle2,
    Database,
    Fingerprint,
    Globe2,
    MapPin,
    MonitorSmartphone,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    ShieldCheck,
    UserMinus,
    UserPlus,
    Users,
    XCircle
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

type RestoreConfigState = {
    restorePanelChannelId?: string;
    verifyRoleId: string;
};

type RestoreEnvState = {
    hasBotToken: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    publicBaseUrl: string;
    restoreRedirectUri: string;
};

type RestoreSettingsState = {
    blacklistUserIds: string[];
    leftServerMinDays: number;
    maxBatchSize: number;
    maxLeaveDetections: number;
    minAccountAgeDays: number;
    minPullDelayMs: number;
    maxPullDelayMs: number;
    minStayDurationDays: number;
    pullCooldownMinutes: number;
    webhookLogsEnabled: boolean;
    webhookUrl: string;
};

type RestoreLogEntry = {
    action: string;
    createdAt: string;
    details?: string;
    status: 'blocked' | 'failed' | 'info' | 'skipped' | 'success';
    userId?: string;
    username?: string;
};

type RestoreMigrationAnalytics = {
    blockedVerifications: number;
    failedPulls: number;
    last24h: number;
    pulled: number;
    skippedPulls: number;
    totalLogs: number;
    verificationLogs: number;
};

type RestoreStatsState = {
    analytics: RestoreAnalyticsState;
    count: number;
    expiredTokens: number;
    latestConsentAt: string | null;
    recent7d: number;
    users: RestoreSavedUser[];
    usersPath: string;
    validTokens: number;
};

type RestoreTopItem = {
    label: string;
    value: number;
};

type RestoreAnalyticsState = {
    browsers: RestoreTopItem[];
    cities: RestoreTopItem[];
    countries: RestoreTopItem[];
    deviceTypes: Record<string, number>;
    languages: RestoreTopItem[];
    locationsKnown: number;
    operatingSystems: RestoreTopItem[];
    restoreOnlyCount: number;
    uniqueIpHashes: number;
    verifiedCount: number;
};

type RestoreSavedUserAnalytics = {
    capturedAt: string | null;
    device: {
        browser: string;
        os: string;
        type: string;
    };
    ipHash: string | null;
    language: string;
    location: {
        city: string;
        country: string;
        countryName: string;
        region: string;
        source: string;
        timezone: string;
    };
    source: string;
};

type RestoreSavedUser = {
    id: string;
    analytics: RestoreSavedUserAnalytics | null;
    username: string;
    displayName: string;
    consentedAt: string | null;
    guildId: string;
    tokenStatus: 'valid' | 'expired';
};

type RestorePullResult = {
    id: string;
    username: string;
    displayName: string;
    consentedAt: string | null;
    tokenStatus: 'valid' | 'expired' | 'missing' | 'refreshed' | 'refresh_failed';
    membership: 'in_guild' | 'missing' | 'unknown';
    action: 'none' | 'pulled' | 'skipped' | 'failed';
    message: string;
};

type RestorePullSummary = {
    checked: number;
    failed: number;
    inGuild: number;
    missing: number;
    pulled: number;
    refreshFailed: number;
    skipped: number;
};

type RestoreView = 'overview' | 'users' | 'operations' | 'analytics' | 'logs';

const RESTORE_VIEWS: { description: string; id: RestoreView; label: string }[] = [
    { id: 'overview', label: 'Przeglad', description: 'Najwazniejsze statusy i szybkie akcje' },
    { id: 'users', label: 'Uzytkownicy', description: 'Wyszukiwarka i pojedynczy pull' },
    { id: 'operations', label: 'Operacje', description: 'Filtry, limity i konfiguracja' },
    { id: 'analytics', label: 'Analityka', description: 'Lokalizacja, urzadzenia i zrodla' },
    { id: 'logs', label: 'Logi', description: 'Migracje i ostatnie eventy' }
];

const DEFAULT_CONFIG: RestoreConfigState = {
    restorePanelChannelId: '',
    verifyRoleId: ''
};

const DEFAULT_ENV: RestoreEnvState = {
    hasBotToken: false,
    hasClientId: false,
    hasClientSecret: false,
    publicBaseUrl: '',
    restoreRedirectUri: ''
};

const DEFAULT_SETTINGS: RestoreSettingsState = {
    blacklistUserIds: [],
    leftServerMinDays: 0,
    maxBatchSize: 250,
    maxLeaveDetections: 0,
    minAccountAgeDays: 0,
    minPullDelayMs: 0,
    maxPullDelayMs: 0,
    minStayDurationDays: 0,
    pullCooldownMinutes: 0,
    webhookLogsEnabled: false,
    webhookUrl: ''
};

const DEFAULT_MIGRATION_ANALYTICS: RestoreMigrationAnalytics = {
    blockedVerifications: 0,
    failedPulls: 0,
    last24h: 0,
    pulled: 0,
    skippedPulls: 0,
    totalLogs: 0,
    verificationLogs: 0
};

const DEFAULT_STATS: RestoreStatsState = {
    analytics: {
        browsers: [],
        cities: [],
        countries: [],
        deviceTypes: {},
        languages: [],
        locationsKnown: 0,
        operatingSystems: [],
        restoreOnlyCount: 0,
        uniqueIpHashes: 0,
        verifiedCount: 0
    },
    count: 0,
    expiredTokens: 0,
    latestConsentAt: null,
    recent7d: 0,
    users: [],
    usersPath: '',
    validTokens: 0
};

const DEFAULT_SUMMARY: RestorePullSummary = {
    checked: 0,
    failed: 0,
    inGuild: 0,
    missing: 0,
    pulled: 0,
    refreshFailed: 0,
    skipped: 0
};

export default function RestoreConfig() {
    const [config, setConfig] = useState<RestoreConfigState>(DEFAULT_CONFIG);
    const [env, setEnv] = useState<RestoreEnvState>(DEFAULT_ENV);
    const [settings, setSettings] = useState<RestoreSettingsState>(DEFAULT_SETTINGS);
    const [stats, setStats] = useState<RestoreStatsState>(DEFAULT_STATS);
    const [logs, setLogs] = useState<RestoreLogEntry[]>([]);
    const [migrationAnalytics, setMigrationAnalytics] = useState<RestoreMigrationAnalytics>(DEFAULT_MIGRATION_ANALYTICS);
    const [results, setResults] = useState<RestorePullResult[]>([]);
    const [summary, setSummary] = useState<RestorePullSummary>(DEFAULT_SUMMARY);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [working, setWorking] = useState<'scan' | 'pull' | null>(null);
    const [workingUserId, setWorkingUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [activeView, setActiveView] = useState<RestoreView>('overview');

    const oauthReady = env.hasClientId && env.hasClientSecret && Boolean(env.publicBaseUrl) && Boolean(env.restoreRedirectUri);
    const botReady = env.hasBotToken;
    const roleReady = Boolean(config.verifyRoleId.trim());
    const needsConfig = !oauthReady || !botReady || !roleReady;
    const missingResults = results.filter((result) => result.membership === 'missing');
    const failedResults = results.filter((result) => result.action === 'failed' || result.tokenStatus === 'refresh_failed');
    const lastConsent = useMemo(() => formatDate(stats.latestConsentAt), [stats.latestConsentAt]);
    const deviceDistribution = useMemo(() => {
        return Object.entries(stats.analytics.deviceTypes)
            .map(([label, value]) => ({ label: formatDeviceTypeLabel(label), value }))
            .sort((first, second) => second.value - first.value);
    }, [stats.analytics.deviceTypes]);
    const topCountry = stats.analytics.countries[0]?.label || 'Brak danych';
    const filteredSavedUsers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return stats.users.slice(0, 40);

        return stats.users
            .filter((user) => {
                const haystack = [
                    user.id,
                    user.username,
                    user.displayName,
                    user.guildId,
                    user.analytics?.device.browser,
                    user.analytics?.device.os,
                    user.analytics?.device.type,
                    user.analytics?.location.city,
                    user.analytics?.location.country,
                    user.analytics?.location.countryName,
                    user.analytics?.location.region
                ].join(' ').toLowerCase();
                return haystack.includes(query);
            })
            .slice(0, 40);
    }, [searchTerm, stats.users]);

    const loadConfig = async () => {
        setLoading(true);

        try {
            const response = await fetch('/api/admin/bot/restore/config');
            const data = await response.json();

            if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
            if (data.env) setEnv({ ...DEFAULT_ENV, ...data.env });
            if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            if (data.stats) setStats({ ...DEFAULT_STATS, ...data.stats });
            if (Array.isArray(data.logs)) setLogs(data.logs);
            if (data.migrationAnalytics) setMigrationAnalytics({ ...DEFAULT_MIGRATION_ANALYTICS, ...data.migrationAnalytics });
        } catch (error) {
            console.error('Failed to load restore config', error);
            setStatusMsg('Nie udalo sie zaladowac danych restore.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadConfig();
    }, []);

    useEffect(() => {
        if (!working) return;

        const interval = window.setInterval(() => {
            void loadConfig();
        }, 2500);

        return () => window.clearInterval(interval);
    }, [working]);

    const saveConfig = async () => {
        setSaving(true);
        setStatusMsg('Zapisywanie konfiguracji...');

        try {
            const response = await fetch('/api/admin/bot/restore/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...config,
                    restoreSettings: settings
                })
            });

            if (!response.ok) throw new Error('Save failed');
            setStatusMsg('Konfiguracja zapisana.');
            void loadConfig();
        } catch (error) {
            console.error(error);
            setStatusMsg('Nie udalo sie zapisac konfiguracji.');
        } finally {
            setSaving(false);
        }
    };

    const runRestoreAction = async (action: 'scan' | 'pull', userIds?: string[]) => {
        const isSingleUser = Boolean(userIds?.length === 1);

        setWorking(action);
        setWorkingUserId(userIds?.[0] ?? null);
        setStatusMsg(
            isSingleUser
                ? action === 'scan'
                    ? 'Sprawdzam wybranego uzytkownika...'
                    : 'Pulluje wybranego uzytkownika...'
                : action === 'scan'
                  ? 'Skanuje zapisane osoby...'
                  : 'Pulluje osoby, ktore wyszly...'
        );

        try {
            const response = await fetch('/api/admin/bot/restore/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    assignVerifyRole: true,
                    limit: settings.maxBatchSize,
                    userIds
                })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Restore action failed');

            setResults(data.results || []);
            setSummary({ ...DEFAULT_SUMMARY, ...(data.summary || {}) });
            setStatusMsg(
                isSingleUser
                    ? data.results?.[0]?.message || 'Akcja dla wybranego uzytkownika zakonczona.'
                    : action === 'scan'
                    ? `Skan zakonczony. Poza serwerem: ${data.summary?.missing ?? 0}.`
                    : `Pull zakonczony. Przywrocono: ${data.summary?.pulled ?? 0}.`
            );
            void loadConfig();
        } catch (error) {
            console.error(error);
            setStatusMsg(error instanceof Error ? error.message : 'Akcja restore nie powiodla sie.');
        } finally {
            setWorking(null);
            setWorkingUserId(null);
        }
    };

    return (
        <div className="restore-panel h-full w-full overflow-y-auto text-white">
            <div className="mx-auto grid w-full max-w-[1500px] gap-6">
                <header className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/25 lg:p-7">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(70%_80%_at_50%_0%,rgba(96,165,250,0.22),transparent_72%)]" />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-blue-200">Admin / Restore</p>
                            <h2 className="mt-2 font-['Poppins'] text-3xl font-medium text-white md:text-4xl">
                                Restore i migracje
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                                Osobne centrum do analityki OAuth, wyszukiwania zapisanych osob i pullowania uzytkownikow, ktorzy wyszli z serwera.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="restore-btn restore-btn-muted" onClick={loadConfig} disabled={loading || Boolean(working)}>
                                <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
                                Odswiez
                            </button>
                            <button type="button" className="restore-btn restore-btn-primary" onClick={() => runRestoreAction('scan')} disabled={Boolean(working) || !botReady}>
                                {working === 'scan' && !workingUserId ? <RefreshCw className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                                Skanuj
                            </button>
                            <button type="button" className="restore-btn restore-btn-success" onClick={() => runRestoreAction('pull')} disabled={Boolean(working) || !botReady || stats.count === 0}>
                                {working === 'pull' && !workingUserId ? <RefreshCw className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                                Pulluj
                            </button>
                        </div>
                    </div>
                </header>

                {statusMsg ? (
                    <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                        {statusMsg}
                    </div>
                ) : null}

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={<Users className="size-5" />} label="Zapisane zgody" value={stats.count} hint={`${stats.recent7d} nowych / 7 dni`} />
                    <MetricCard icon={<ShieldCheck className="size-5" />} label="Tokeny aktywne" value={stats.validTokens} hint={`${stats.expiredTokens} wygaslych`} />
                    <MetricCard icon={<UserMinus className="size-5" />} label="Poza serwerem" value={summary.missing || missingResults.length} hint={summary.checked ? `${summary.checked} sprawdzonych` : 'Wymaga skanu'} />
                    <MetricCard icon={<RotateCcw className="size-5" />} label="Przywrocono" value={summary.pulled} hint={summary.failed ? `${summary.failed} bledow` : 'Ostatnia akcja'} />
                </section>

                <RestoreViewTabs
                    activeView={activeView}
                    counts={{ analytics: stats.analytics.locationsKnown, logs: logs.length, users: stats.count }}
                    onChange={setActiveView}
                />

                {activeView === 'overview' ? (
                    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                        <div className="grid gap-6">
                            <PanelCard title="Gotowosc systemu">
                                <div className="grid gap-3">
                                    <ReadinessRow ok={oauthReady} label="OAuth" detail={oauthReady ? 'Skonfigurowany' : 'Brakuje PUBLIC_BASE_URL lub danych Discord app'} />
                                    <ReadinessRow ok={botReady} label="Bot" detail={botReady ? 'Token dostepny' : 'Brakuje DISCORD_BOT_TOKEN'} />
                                    <ReadinessRow ok={roleReady} label="Rola" detail={roleReady ? config.verifyRoleId : 'Ustaw role weryfikacji'} />
                                </div>
                            </PanelCard>

                            <PanelCard title="Ostatni skan">
                                {results.length > 0 ? (
                                    <div className="grid gap-4">
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <MiniSummary label="Na serwerze" value={summary.inGuild} tone="ok" />
                                            <MiniSummary label="Wyszli" value={summary.missing} tone="warn" />
                                            <MiniSummary label="Bledy" value={failedResults.length || summary.failed} tone="bad" />
                                        </div>
                                        <div className="grid gap-2">
                                            {results.slice(0, 5).map((result) => (
                                                <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-white">{result.displayName}</p>
                                                        <p className="truncate text-xs text-slate-500">{result.id}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <StatusPill value={result.membership} />
                                                        <ActionPill value={result.action} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={<Database className="size-6" />}
                                        title="Zrob pierwszy skan"
                                        text="Skan porowna zapisane zgody restore z aktualnymi czlonkami serwera i pokaze, kogo da sie przywrocic."
                                    />
                                )}
                            </PanelCard>
                        </div>

                        <div className="grid gap-6">
                            <PanelCard title="Szybkie akcje">
                                <div className="grid gap-3">
                                    <button type="button" className="restore-btn restore-btn-primary w-full" onClick={() => runRestoreAction('scan')} disabled={Boolean(working) || !botReady}>
                                        {working === 'scan' && !workingUserId ? <RefreshCw className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                                        Skanuj zapisanych
                                    </button>
                                    <button type="button" className="restore-btn restore-btn-success w-full" onClick={() => runRestoreAction('pull')} disabled={Boolean(working) || !botReady || stats.count === 0}>
                                        {working === 'pull' && !workingUserId ? <RefreshCw className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                                        Pulluj osoby poza serwerem
                                    </button>
                                    <button type="button" className="restore-btn restore-btn-muted w-full" onClick={saveConfig} disabled={saving}>
                                        {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                                        Zapisz ustawienia
                                    </button>
                                </div>
                            </PanelCard>

                            <PanelCard title="Dane">
                                <div className="grid gap-3 text-sm text-slate-400">
                                    <InfoRow label="Ostatnia zgoda" value={lastConsent} />
                                    <InfoRow label="Callback OAuth" value={env.restoreRedirectUri || 'Brak'} />
                                    <InfoRow label="Plik zgod" value={stats.usersPath || 'Brak'} />
                                </div>
                            </PanelCard>
                        </div>
                    </section>
                ) : null}

                {activeView === 'users' ? (
                    <section className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
                        <PanelCard title="Zapisani uzytkownicy">
                            <div className="grid gap-4">
                                <label className="relative block">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        className="restore-input pl-10"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Szukaj po nicku, ID, kraju lub urzadzeniu"
                                    />
                                </label>
                                <div className="max-h-[650px] overflow-y-auto pr-1">
                                    {filteredSavedUsers.length > 0 ? (
                                        <div className="grid gap-2">
                                            {filteredSavedUsers.map((user) => (
                                                <SavedUserRow
                                                    key={user.id}
                                                    user={user}
                                                    disabled={!botReady || Boolean(working)}
                                                    working={working === 'pull' && workingUserId === user.id}
                                                    onPull={() => runRestoreAction('pull', [user.id])}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-slate-500">
                                            Brak zapisanych osob dla tego wyszukiwania.
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs leading-relaxed text-slate-500">
                                    Pokazuje maksymalnie 40 wynikow. Pull pojedynczy uzywa tej samej logiki co pull masowy: membership, refresh tokenu i rola.
                                </p>
                            </div>
                        </PanelCard>

                        <PanelCard title="Live status zapisanych osob">
                            {results.length > 0 ? (
                                <RestoreResultsTable
                                    botReady={botReady}
                                    failedCount={failedResults.length || summary.failed}
                                    onPull={(id) => runRestoreAction('pull', [id])}
                                    results={results}
                                    summary={summary}
                                    working={working}
                                    workingUserId={workingUserId}
                                />
                            ) : (
                                <EmptyState
                                    icon={<Database className="size-6" />}
                                    title="Brak wyniku skanu"
                                    text="Uruchom skan z naglowka albo z przegladu, zeby zobaczyc status zapisanych osob."
                                />
                            )}
                        </PanelCard>
                    </section>
                ) : null}

                {activeView === 'operations' ? (
                    <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                        <div className="grid gap-6">
                            <PanelCard title="Konfiguracja roli">
                                <div className="grid gap-4">
                                    <label className="grid gap-2">
                                        <span className="text-xs font-semibold uppercase text-slate-500">ID roli weryfikacji</span>
                                        <input
                                            className="restore-input"
                                            value={config.verifyRoleId}
                                            onChange={(event) => setConfig((current) => ({ ...current, verifyRoleId: event.target.value }))}
                                            placeholder="123456789012345678"
                                        />
                                    </label>
                                    <button type="button" className="restore-btn restore-btn-primary w-full" onClick={saveConfig} disabled={saving}>
                                        {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                                        Zapisz role
                                    </button>
                                </div>
                            </PanelCard>

                            <PanelCard title="Gotowosc systemu">
                                <div className="grid gap-3">
                                    <ReadinessRow ok={oauthReady} label="OAuth" detail={oauthReady ? 'Skonfigurowany' : 'Brakuje PUBLIC_BASE_URL lub danych Discord app'} />
                                    <ReadinessRow ok={botReady} label="Bot" detail={botReady ? 'Token dostepny' : 'Brakuje DISCORD_BOT_TOKEN'} />
                                    <ReadinessRow ok={roleReady} label="Rola" detail={roleReady ? config.verifyRoleId : 'Ustaw role weryfikacji'} />
                                </div>
                            </PanelCard>
                        </div>

                        <PanelCard title="Filtry i limity pullowania">
                            <div className="grid gap-4">
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <SettingsNumberField label="Cooldown pull (min)" value={settings.pullCooldownMinutes} onChange={(value) => setSettings((current) => ({ ...current, pullCooldownMinutes: value }))} />
                                    <SettingsNumberField label="Max batch" value={settings.maxBatchSize} onChange={(value) => setSettings((current) => ({ ...current, maxBatchSize: value }))} />
                                    <SettingsNumberField label="Delay min (ms)" value={settings.minPullDelayMs} onChange={(value) => setSettings((current) => ({ ...current, minPullDelayMs: value }))} />
                                    <SettingsNumberField label="Delay max (ms)" value={settings.maxPullDelayMs} onChange={(value) => setSettings((current) => ({ ...current, maxPullDelayMs: value }))} />
                                    <SettingsNumberField label="Min account age (dni)" value={settings.minAccountAgeDays} onChange={(value) => setSettings((current) => ({ ...current, minAccountAgeDays: value }))} />
                                    <SettingsNumberField label="Min stay (dni)" value={settings.minStayDurationDays} onChange={(value) => setSettings((current) => ({ ...current, minStayDurationDays: value }))} />
                                    <SettingsNumberField label="Left X dni" value={settings.leftServerMinDays} onChange={(value) => setSettings((current) => ({ ...current, leftServerMinDays: value }))} />
                                    <SettingsNumberField label="Max leave detections" value={settings.maxLeaveDetections} onChange={(value) => setSettings((current) => ({ ...current, maxLeaveDetections: value }))} />
                                </div>
                                <label className="grid gap-2">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Blacklist user ID</span>
                                    <textarea
                                        className="restore-input min-h-[110px] resize-y"
                                        value={settings.blacklistUserIds.join('\n')}
                                        onChange={(event) => setSettings((current) => ({
                                            ...current,
                                            blacklistUserIds: event.target.value.split(/\s+/).flatMap((id) => {
                                                const trimmedId = id.trim();
                                                return trimmedId ? [trimmedId] : [];
                                            })
                                        }))}
                                        placeholder="Jedno ID na linie"
                                    />
                                </label>
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                                    <label className="grid gap-2">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Webhook logow</span>
                                        <input
                                            className="restore-input"
                                            value={settings.webhookUrl}
                                            onChange={(event) => setSettings((current) => ({ ...current, webhookUrl: event.target.value }))}
                                            placeholder="https://discord.com/api/webhooks/..."
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                                        <span>
                                            <span className="block text-sm font-semibold text-white">Webhook logs</span>
                                            <span className="block text-xs text-slate-500">Verify i pull.</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={settings.webhookLogsEnabled}
                                            onChange={(event) => setSettings((current) => ({ ...current, webhookLogsEnabled: event.target.checked }))}
                                        />
                                    </label>
                                </div>
                                <button type="button" className="restore-btn restore-btn-primary w-full" onClick={saveConfig} disabled={saving}>
                                    {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    Zapisz operacje
                                </button>
                            </div>
                        </PanelCard>
                    </section>
                ) : null}

                {activeView === 'analytics' ? (
                    <>
                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard icon={<MonitorSmartphone className="size-5" />} label="Weryfikacje" value={stats.analytics.verifiedCount} hint={`${stats.analytics.restoreOnlyCount} restore-only`} />
                            <MetricCard icon={<MapPin className="size-5" />} label="Lokalizacje" value={stats.analytics.locationsKnown} hint={topCountry} />
                            <MetricCard icon={<Fingerprint className="size-5" />} label="Unikalne IP" value={stats.analytics.uniqueIpHashes} hint="Hash, bez surowego IP" />
                            <MetricCard icon={<Globe2 className="size-5" />} label="Jezyki" value={stats.analytics.languages.length} hint={stats.analytics.languages[0]?.label || 'Brak danych'} />
                        </section>

                        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            <PanelCard title="Urzadzenia">
                                <DistributionList emptyLabel="Brak danych urzadzen" items={deviceDistribution} total={stats.count} />
                            </PanelCard>
                            <PanelCard title="Kraje">
                                <DistributionList emptyLabel="Brak danych lokalizacji" items={stats.analytics.countries} total={stats.count} />
                            </PanelCard>
                            <PanelCard title="Przegladarki">
                                <DistributionList emptyLabel="Brak danych przegladarek" items={stats.analytics.browsers} total={stats.count} />
                            </PanelCard>
                            <PanelCard title="Systemy">
                                <DistributionList emptyLabel="Brak danych systemow" items={stats.analytics.operatingSystems} total={stats.count} />
                            </PanelCard>
                            <PanelCard title="Miasta">
                                <DistributionList emptyLabel="Brak danych miast" items={stats.analytics.cities} total={stats.count} />
                            </PanelCard>
                            <PanelCard title="Jezyki">
                                <DistributionList emptyLabel="Brak danych jezykow" items={stats.analytics.languages} total={stats.count} />
                            </PanelCard>
                        </section>
                    </>
                ) : null}

                {activeView === 'logs' ? (
                    <>
                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard icon={<RotateCcw className="size-5" />} label="Pull success" value={migrationAnalytics.pulled} hint={`${migrationAnalytics.last24h} logow / 24h`} />
                            <MetricCard icon={<UserMinus className="size-5" />} label="Pominiete" value={migrationAnalytics.skippedPulls} hint="Filtry i warunki" />
                            <MetricCard icon={<XCircle className="size-5" />} label="Bledy pull" value={migrationAnalytics.failedPulls} hint={`${migrationAnalytics.totalLogs} logow lacznie`} />
                            <MetricCard icon={<AlertTriangle className="size-5" />} label="Blokady verify" value={migrationAnalytics.blockedVerifications} hint={`${migrationAnalytics.verificationLogs} logow verify`} />
                        </section>

                        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                            <PanelCard title="Realtime migration logs">
                                <RestoreLogsList logs={logs} />
                            </PanelCard>
                            <PanelCard title="Ostatni wynik">
                                {results.length > 0 ? (
                                    <div className="grid gap-3">
                                        <MiniSummary label="Sprawdzone" value={summary.checked} tone="ok" />
                                        <MiniSummary label="Wyszli" value={summary.missing} tone="warn" />
                                        <MiniSummary label="Bledy" value={failedResults.length || summary.failed} tone="bad" />
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={<Database className="size-6" />}
                                        title="Brak ostatniej akcji"
                                        text="Po skanie albo pullowaniu zobaczysz tutaj podsumowanie ostatniej operacji."
                                    />
                                )}
                            </PanelCard>
                        </section>
                    </>
                ) : null}

                {needsConfig ? (
                    <div className="rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-5 text-sm leading-relaxed text-amber-100">
                        <div className="mb-2 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="size-4" />
                            Wymagana konfiguracja
                        </div>
                        {!oauthReady ? <p>Ustaw PUBLIC_BASE_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET i RESTORE_REDIRECT_URI.</p> : null}
                        {!botReady ? <p>Ustaw DISCORD_BOT_TOKEN, bo scan/pull uzywa Discord API bota.</p> : null}
                        {!roleReady ? <p>Ustaw role weryfikacji, jezeli pull ma od razu synchronizowac role.</p> : null}
                    </div>
                ) : null}
            </div>

            <RestorePanelStyles />
        </div>
    );
}

function RestoreViewTabs({
    activeView,
    counts,
    onChange
}: {
    activeView: RestoreView;
    counts: Partial<Record<RestoreView, number>>;
    onChange: (view: RestoreView) => void;
}) {
    return (
        <nav className="grid gap-2 rounded-[24px] border border-white/10 bg-white/[0.035] p-2 md:grid-cols-5">
            {RESTORE_VIEWS.map((view) => {
                const isActive = activeView === view.id;
                const count = counts[view.id];

                return (
                    <button
                        key={view.id}
                        type="button"
                        onClick={() => onChange(view.id)}
                        className={[
                            'min-h-[76px] rounded-[18px] px-4 py-3 text-left transition',
                            isActive
                                ? 'bg-blue-500/20 text-white ring-1 ring-blue-300/30'
                                : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                        ].join(' ')}
                    >
                        <span className="flex items-center justify-between gap-3">
                            <span className="text-sm font-bold">{view.label}</span>
                            {typeof count === 'number' ? (
                                <span className="rounded-full bg-black/25 px-2 py-0.5 text-xs font-bold text-blue-100">
                                    {count}
                                </span>
                            ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{view.description}</span>
                    </button>
                );
            })}
        </nav>
    );
}

function EmptyState({ icon, text, title }: { icon: React.ReactNode; text: string; title: string }) {
    return (
        <div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <div className="max-w-md">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                    {icon}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
            </div>
        </div>
    );
}

function RestoreResultsTable({
    botReady,
    failedCount,
    onPull,
    results,
    summary,
    working,
    workingUserId
}: {
    botReady: boolean;
    failedCount: number;
    onPull: (id: string) => void;
    results: RestorePullResult[];
    summary: RestorePullSummary;
    working: 'scan' | 'pull' | null;
    workingUserId: string | null;
}) {
    return (
        <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
                <MiniSummary label="Na serwerze" value={summary.inGuild} tone="ok" />
                <MiniSummary label="Wyszli" value={summary.missing} tone="warn" />
                <MiniSummary label="Bledy" value={failedCount} tone="bad" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="max-h-[640px] overflow-y-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="sticky top-0 bg-[#10131c] text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Uzytkownik</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Token</th>
                                <th className="px-4 py-3">Akcja</th>
                                <th className="px-4 py-3">Info</th>
                                <th className="px-4 py-3">Pull</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {results.map((result) => (
                                <tr key={result.id} className="bg-white/[0.02]">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-white">{result.displayName}</div>
                                        <div className="text-xs text-slate-500">{result.id}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusPill value={result.membership} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <TokenPill value={result.tokenStatus} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <ActionPill value={result.action} />
                                    </td>
                                    <td className="max-w-[320px] px-4 py-3 text-xs leading-relaxed text-slate-400">
                                        {result.message || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button type="button"
                                            className="restore-btn restore-btn-muted min-h-9 px-3 text-xs"
                                            onClick={() => onPull(result.id)}
                                            disabled={!botReady || Boolean(working)}
                                        >
                                            {working === 'pull' && workingUserId === result.id ? <RefreshCw className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                                            Pull
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PanelCard({ children, title }: { children: React.ReactNode; title: string }) {
    return (
        <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-normal text-slate-300">{title}</h3>
            {children}
        </section>
    );
}

function MetricCard({ hint, icon, label, value }: { hint: string; icon: React.ReactNode; label: string; value: number | string }) {
    return (
        <article className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                    {icon}
                </span>
                <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            </div>
            <p className="mt-5 text-3xl font-black text-white">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </article>
    );
}

function ReadinessRow({ detail, label, ok }: { detail: string; label: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                {ok ? <CheckCircle2 className="size-4 text-emerald-300" /> : <XCircle className="size-4 text-red-300" />}
                {label}
            </span>
            <span className="max-w-[220px] truncate text-right text-xs text-slate-500">{detail}</span>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <span className="break-all text-sm text-slate-300">{value}</span>
        </div>
    );
}

function SettingsNumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
    return (
        <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <input
                className="restore-input"
                min={0}
                type="number"
                value={value}
                onChange={(event) => onChange(Number(event.target.value) || 0)}
            />
        </label>
    );
}

function DistributionList({ emptyLabel, items, total }: { emptyLabel: string; items: RestoreTopItem[]; total: number }) {
    if (!items.length) {
        return (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-slate-500">
                {emptyLabel}
            </div>
        );
    }

    return (
        <div className="grid gap-3">
            {items.map((item) => {
                const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

                return (
                    <div key={item.label} className="grid gap-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-semibold text-slate-200">{item.label}</span>
                            <span className="shrink-0 text-xs text-slate-500">{item.value} / {percent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-black/30">
                            <div className="h-full rounded-full bg-blue-400/80" style={{ width: `${Math.max(percent, 4)}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function RestoreLogsList({ logs }: { logs: RestoreLogEntry[] }) {
    if (!logs.length) {
        return (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-slate-500">
                Brak logow migracji.
            </div>
        );
    }

    return (
        <div className="max-h-[420px] overflow-y-auto pr-1">
            <div className="grid gap-2">
                {logs.slice(0, 30).map((log) => (
                    <div key={`${log.createdAt}-${log.userId ?? log.action}-${log.status}-${log.details ?? ''}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <LogStatusPill status={log.status} />
                                <span className="text-sm font-semibold uppercase text-slate-300">{log.action}</span>
                            </div>
                            <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{log.details || '-'}</p>
                        {log.userId ? (
                            <p className="mt-1 truncate text-xs text-slate-500">
                                {log.username || 'Unknown'} / {log.userId}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

function LogStatusPill({ status }: { status: RestoreLogEntry['status'] }) {
    const colors = {
        blocked: 'bg-red-500/15 text-red-200',
        failed: 'bg-red-500/15 text-red-200',
        info: 'bg-blue-500/15 text-blue-200',
        skipped: 'bg-amber-500/15 text-amber-200',
        success: 'bg-emerald-500/15 text-emerald-200'
    };

    return <Pill className={colors[status]}>{status}</Pill>;
}

function SavedUserRow({
    disabled,
    onPull,
    user,
    working
}: {
    disabled: boolean;
    onPull: () => void;
    user: RestoreSavedUser;
    working: boolean;
}) {
    const deviceText = formatDevice(user.analytics?.device);
    const locationText = formatLocation(user.analytics?.location);

    return (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{user.displayName}</p>
                    <TokenPill value={user.tokenStatus} />
                    {user.analytics?.source === 'verify' ? <Pill className="bg-blue-500/15 text-blue-200">Verify</Pill> : null}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{user.username}</p>
                <p className="mt-1 truncate text-xs text-slate-600">{user.id}</p>
                <p className="mt-2 truncate text-xs text-slate-500">{deviceText}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{locationText}</p>
                <p className="mt-2 text-xs text-slate-500">Zgoda: {formatDate(user.consentedAt)}</p>
            </div>
            <button type="button" className="restore-btn restore-btn-success min-h-10 px-3 text-xs" onClick={onPull} disabled={disabled}>
                {working ? <RefreshCw className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                Pull
            </button>
        </div>
    );
}

function MiniSummary({ label, tone, value }: { label: string; tone: 'bad' | 'ok' | 'warn'; value: number }) {
    const colors = {
        bad: 'border-red-300/20 bg-red-500/10 text-red-100',
        ok: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
        warn: 'border-amber-300/20 bg-amber-500/10 text-amber-100'
    };

    return (
        <div className={`rounded-2xl border px-4 py-3 ${colors[tone]}`}>
            <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
        </div>
    );
}

function StatusPill({ value }: { value: RestorePullResult['membership'] }) {
    if (value === 'in_guild') return <Pill className="bg-emerald-500/15 text-emerald-200">Na serwerze</Pill>;
    if (value === 'missing') return <Pill className="bg-amber-500/15 text-amber-200">Wyszedl</Pill>;
    return <Pill className="bg-zinc-500/15 text-zinc-300">Nieznany</Pill>;
}

function TokenPill({ value }: { value: RestorePullResult['tokenStatus'] }) {
    if (value === 'valid') return <Pill className="bg-emerald-500/15 text-emerald-200">Aktywny</Pill>;
    if (value === 'refreshed') return <Pill className="bg-blue-500/15 text-blue-200">Odswiezony</Pill>;
    if (value === 'expired') return <Pill className="bg-amber-500/15 text-amber-200">Wygasl</Pill>;
    if (value === 'refresh_failed') return <Pill className="bg-red-500/15 text-red-200">Blad refresh</Pill>;
    return <Pill className="bg-zinc-500/15 text-zinc-300">Brak</Pill>;
}

function ActionPill({ value }: { value: RestorePullResult['action'] }) {
    if (value === 'pulled') return <Pill className="bg-emerald-500/15 text-emerald-200">Pulled</Pill>;
    if (value === 'failed') return <Pill className="bg-red-500/15 text-red-200">Blad</Pill>;
    if (value === 'skipped') return <Pill className="bg-zinc-500/15 text-zinc-300">Pominieto</Pill>;
    return <Pill className="bg-blue-500/15 text-blue-200">Scan</Pill>;
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
            {children}
        </span>
    );
}

function RestorePanelStyles() {
    return (
        <style>{`
.restore-panel .restore-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 10px 14px;
  color: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}
.restore-panel .restore-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(147, 197, 253, 0.45);
}
.restore-panel .restore-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.restore-panel .restore-btn-primary {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
}
.restore-panel .restore-btn-success {
  background: linear-gradient(135deg, #059669, #0f766e);
}
.restore-panel .restore-btn-muted {
  background: rgba(255, 255, 255, 0.06);
}
.restore-panel .restore-input {
  width: 100%;
  min-height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.45);
  color: #f8fafc;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
}
.restore-panel .restore-input:focus {
  border-color: rgba(96, 165, 250, 0.65);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}
`}</style>
    );
}

function formatDate(value: string | null) {
    if (!value) return 'Brak danych';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('pl', {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function formatDevice(device?: RestoreSavedUserAnalytics['device']) {
    if (!device) return 'Urzadzenie: brak danych';

    return [
        formatDeviceTypeLabel(device.type),
        device.os !== 'Unknown' ? device.os : '',
        device.browser !== 'Unknown' ? device.browser : ''
    ].filter(Boolean).join(' / ') || 'Urzadzenie: brak danych';
}

function formatLocation(location?: RestoreSavedUserAnalytics['location']) {
    if (!location) return 'Lokalizacja: brak danych';

    const cityLine = [location.city, location.region].filter(Boolean).join(', ');
    const country = location.countryName || location.country;
    const value = [cityLine, country].filter(Boolean).join(' - ');

    return value ? `Lokalizacja: ${value}` : 'Lokalizacja: brak danych';
}

function formatDeviceTypeLabel(value: string) {
    const labels: Record<string, string> = {
        bot: 'Bot',
        desktop: 'Desktop',
        mobile: 'Mobile',
        tablet: 'Tablet',
        unknown: 'Unknown'
    };

    return labels[value] ?? value;
}
