import {
    AlertTriangle,
    CheckCircle2,
    Database,
    RefreshCw,
    RotateCcw,
    Save,
    ShieldCheck,
    UserMinus,
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

type RestoreStatsState = {
    count: number;
    expiredTokens: number;
    latestConsentAt: string | null;
    recent7d: number;
    usersPath: string;
    validTokens: number;
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
};

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

const DEFAULT_STATS: RestoreStatsState = {
    count: 0,
    expiredTokens: 0,
    latestConsentAt: null,
    recent7d: 0,
    usersPath: '',
    validTokens: 0
};

const DEFAULT_SUMMARY: RestorePullSummary = {
    checked: 0,
    failed: 0,
    inGuild: 0,
    missing: 0,
    pulled: 0,
    refreshFailed: 0
};

export default function RestoreConfig() {
    const [config, setConfig] = useState<RestoreConfigState>(DEFAULT_CONFIG);
    const [env, setEnv] = useState<RestoreEnvState>(DEFAULT_ENV);
    const [stats, setStats] = useState<RestoreStatsState>(DEFAULT_STATS);
    const [results, setResults] = useState<RestorePullResult[]>([]);
    const [summary, setSummary] = useState<RestorePullSummary>(DEFAULT_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [working, setWorking] = useState<'scan' | 'pull' | null>(null);
    const [statusMsg, setStatusMsg] = useState('');

    const oauthReady = env.hasClientId && env.hasClientSecret && Boolean(env.publicBaseUrl) && Boolean(env.restoreRedirectUri);
    const botReady = env.hasBotToken;
    const roleReady = Boolean(config.verifyRoleId.trim());
    const missingResults = results.filter((result) => result.membership === 'missing');
    const failedResults = results.filter((result) => result.action === 'failed' || result.tokenStatus === 'refresh_failed');
    const lastConsent = useMemo(() => formatDate(stats.latestConsentAt), [stats.latestConsentAt]);

    const loadConfig = async () => {
        setLoading(true);

        try {
            const response = await fetch('/api/admin/bot/restore/config');
            const data = await response.json();

            if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
            if (data.env) setEnv({ ...DEFAULT_ENV, ...data.env });
            if (data.stats) setStats({ ...DEFAULT_STATS, ...data.stats });
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

    const saveConfig = async () => {
        setSaving(true);
        setStatusMsg('Zapisywanie konfiguracji...');

        try {
            const response = await fetch('/api/admin/bot/restore/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
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

    const runRestoreAction = async (action: 'scan' | 'pull') => {
        setWorking(action);
        setStatusMsg(action === 'scan' ? 'Skanuje zapisane osoby...' : 'Pulluje osoby, ktore wyszly...');

        try {
            const response = await fetch('/api/admin/bot/restore/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    assignVerifyRole: true,
                    limit: 1000
                })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Restore action failed');

            setResults(data.results || []);
            setSummary({ ...DEFAULT_SUMMARY, ...(data.summary || {}) });
            setStatusMsg(
                action === 'scan'
                    ? `Skan zakonczony. Poza serwerem: ${data.summary?.missing ?? 0}.`
                    : `Pull zakonczony. Przywrocono: ${data.summary?.pulled ?? 0}.`
            );
            void loadConfig();
        } catch (error) {
            console.error(error);
            setStatusMsg(error instanceof Error ? error.message : 'Akcja restore nie powiodla sie.');
        } finally {
            setWorking(null);
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto bg-black/40 p-5 text-white md:p-7">
            <div className="mx-auto grid w-full max-w-7xl gap-6">
                <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-blue-200">Restore analytics</p>
                        <h2 className="mt-2 font-['Poppins'] text-3xl font-medium text-white">
                            Zarzadzanie restore i pull
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                            Monitoruj zgody OAuth, sprawdzaj kto opuscil serwer i przywracaj osoby z zapisanym restore.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button className="restore-btn restore-btn-muted" onClick={loadConfig} disabled={loading || Boolean(working)}>
                            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
                            Odswiez
                        </button>
                        <button className="restore-btn restore-btn-primary" onClick={() => runRestoreAction('scan')} disabled={Boolean(working) || !botReady}>
                            {working === 'scan' ? <RefreshCw className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                            Skanuj osoby
                        </button>
                        <button className="restore-btn restore-btn-success" onClick={() => runRestoreAction('pull')} disabled={Boolean(working) || !botReady || stats.count === 0}>
                            {working === 'pull' ? <RefreshCw className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                            Pulluj wyszlych
                        </button>
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

                <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <div className="grid gap-6">
                        <PanelCard title="Konfiguracja">
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
                                <button className="restore-btn restore-btn-primary w-full" onClick={saveConfig} disabled={saving}>
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

                        <PanelCard title="Dane">
                            <div className="grid gap-3 text-sm text-slate-400">
                                <InfoRow label="Ostatnia zgoda" value={lastConsent} />
                                <InfoRow label="Callback OAuth" value={env.restoreRedirectUri || 'Brak'} />
                                <InfoRow label="Plik zgod" value={stats.usersPath || 'Brak'} />
                            </div>
                        </PanelCard>
                    </div>

                    <PanelCard title="Live status zapisanych osob">
                        {results.length > 0 ? (
                            <div className="grid gap-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <MiniSummary label="Na serwerze" value={summary.inGuild} tone="ok" />
                                    <MiniSummary label="Wyszli" value={summary.missing} tone="warn" />
                                    <MiniSummary label="Bledy" value={failedResults.length || summary.failed} tone="bad" />
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-white/10">
                                    <div className="max-h-[560px] overflow-y-auto">
                                        <table className="w-full min-w-[720px] text-left text-sm">
                                            <thead className="sticky top-0 bg-[#10131c] text-xs uppercase text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3">Uzytkownik</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3">Token</th>
                                                    <th className="px-4 py-3">Akcja</th>
                                                    <th className="px-4 py-3">Info</th>
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
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                                <div className="max-w-md">
                                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                                        <Database className="size-6" />
                                    </span>
                                    <h3 className="mt-5 text-xl font-semibold text-white">Zrob pierwszy skan</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        Skan porowna zapisane zgody restore z aktualnymi czlonkami serwera. Potem mozesz pullowac tylko osoby, ktore wyszly.
                                    </p>
                                </div>
                            </div>
                        )}
                    </PanelCard>
                </section>

                {!oauthReady || !botReady || !roleReady ? (
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
