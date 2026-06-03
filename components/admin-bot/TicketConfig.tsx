import SmartImage from "@/components/SmartImage";
import React, { useEffect, useState } from 'react';
import EmbedForm from './EmbedForm';
import EmbedPreview from './EmbedPreview';
import { EmbedData } from './types';
import { ImageIcon, Save, Send, Trash2, X } from 'lucide-react';

interface TicketCategory {
    id: string;
    label: string;
    emoji: string;
    description: string;
    value: string;
}

interface TicketConfigIds {
    ticketCategoryId: string;
    supportRoleId: string;
    ticketPanelChannelId: string;
    ticketCategories: TicketCategory[];
}

const DEFAULT_CONFIG: TicketConfigIds = {
    ticketCategoryId: '',
    supportRoleId: '',
    ticketPanelChannelId: '',
    ticketCategories: []
};

const DEFAULT_PANEL_EMBED: EmbedData = {
    title: 'Stworz Ticket',
    description: 'Aby skontaktowac sie z administracja, kliknij przycisk ponizej.',
    color: '#5865f2',
    author: { name: '', url: '', icon_url: '' },
    thumbnail_url: '',
    image_url: '',
    footer: { text: 'RepDock Support', icon_url: '' },
    timestamp: false,
    fields: [],
    url: '',
    buttons: []
};

const DEFAULT_WELCOME_EMBED: EmbedData = {
    title: 'Witaj w zgloszeniu!',
    description: 'Opisz swoj problem, a czlonek zespolu wkrotce Ci pomoze.',
    color: '#57f287',
    author: { name: '', url: '', icon_url: '' },
    thumbnail_url: '',
    image_url: '',
    footer: { text: '', icon_url: '' },
    timestamp: true,
    fields: [],
    url: '',
    buttons: []
};

function categoryValue(label: string) {
    return label.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

function normalizeCategories(rawCats: unknown): TicketCategory[] {
    if (typeof rawCats === 'string') {
        return rawCats
            .split(',')
            .flatMap((s) => {
                const label = s.trim();
                return label ? [label] : [];
            })
            .map((label, index) => ({
                id: `${Date.now()}-${index}`,
                label,
                value: categoryValue(label),
                emoji: '🎫',
                description: 'Kategoria zgloszenia'
            }));
    }

    if (!Array.isArray(rawCats)) return [];

    return rawCats
        .filter((cat): cat is Partial<TicketCategory> => !!cat && typeof cat === 'object')
        .map((cat, index) => {
            const label = String(cat.label || cat.value || `Kategoria ${index + 1}`);
            return {
                id: String(cat.id || `${Date.now()}-${index}`),
                label,
                value: String(cat.value || categoryValue(label)),
                emoji: String(cat.emoji || '🎫'),
                description: String(cat.description || '')
            };
        });
}

function normalizeConfig(ids: Partial<TicketConfigIds> = {}): TicketConfigIds {
    return {
        ticketCategoryId: ids.ticketCategoryId || '',
        supportRoleId: ids.supportRoleId || '',
        ticketPanelChannelId: ids.ticketPanelChannelId || '',
        ticketCategories: normalizeCategories(ids.ticketCategories)
    };
}

function TicketBottomGraphic({
    imageUrl,
    label,
    onChange
}: {
    imageUrl: string;
    label: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="section" style={{ background: 'var(--background-secondary)', border: '1px solid var(--background-tertiary)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <ImageIcon size={16} />
                <h3 className="section-title" style={{ margin: 0 }}>{label}</h3>
            </div>
            <div className="form-group" style={{ marginBottom: imageUrl ? '12px' : 0 }}>
                <label className="form-label">URL grafiki</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        className="form-input"
                        placeholder="https://..."
                        type="text"
                        value={imageUrl}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    {imageUrl ? (
                        <button className="btn btn-outline" type="button" onClick={() => onChange('')} title="Usun grafike">
                            <X size={16} />
                        </button>
                    ) : null}
                </div>
            </div>
            {imageUrl ? (
                <div style={{ overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--background-tertiary)', background: 'var(--background-tertiary)' }}>
                    <SmartImage
                        alt="Podglad grafiki ticketow"
                        src={imageUrl}
                        style={{ display: 'block', width: '100%', maxHeight: '180px', objectFit: 'cover' }}
                    />
                </div>
            ) : (
                <p className="text-muted text-small" style={{ margin: 0 }}>
                    Wklej link do obrazka, ktory ma pojawic sie na dole embeda.
                </p>
            )}
        </div>
    );
}

export default function TicketConfig() {
    const [config, setConfig] = useState<TicketConfigIds>(DEFAULT_CONFIG);
    const [panelEmbed, setPanelEmbed] = useState<EmbedData>(DEFAULT_PANEL_EMBED);
    const [welcomeEmbed, setWelcomeEmbed] = useState<EmbedData>(DEFAULT_WELCOME_EMBED);
    const [newCat, setNewCat] = useState({ label: '', emoji: '', description: '' });
    const [activeTab, setActiveTab] = useState<'panel' | 'welcome'>('panel');
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        let ignore = false;

        async function loadConfig() {
            const res = await fetch('/api/admin/bot/tickets/config');
            const data = await res.json();
            if (ignore || !data.config) return;

            if (data.config.ids) setConfig(normalizeConfig(data.config.ids));
            if (data.config.panelEmbed) setPanelEmbed(data.config.panelEmbed);
            if (data.config.welcomeEmbed) setWelcomeEmbed(data.config.welcomeEmbed);
        }

        void loadConfig().catch((error) => {
            console.error('Failed to load ticket config', error);
        });

        return () => {
            ignore = true;
        };
    }, []);

    const addCategory = () => {
        const label = newCat.label.trim();
        if (!label) return;

        const category: TicketCategory = {
            id: Date.now().toString(),
            label,
            value: categoryValue(label),
            emoji: newCat.emoji || '🎫',
            description: newCat.description || ''
        };

        setConfig((prev) => ({
            ...prev,
            ticketCategories: [...prev.ticketCategories, category]
        }));
        setNewCat({ label: '', emoji: '', description: '' });
    };

    const removeCategory = (id: string) => {
        setConfig((prev) => ({
            ...prev,
            ticketCategories: prev.ticketCategories.filter((category) => category.id !== id)
        }));
    };

    const activeGraphicUrl = activeTab === 'panel' ? panelEmbed.image_url || '' : welcomeEmbed.image_url || '';

    const setActiveGraphicUrl = (value: string) => {
        if (activeTab === 'panel') {
            setPanelEmbed((prev) => ({ ...prev, image_url: value }));
            return;
        }

        setWelcomeEmbed((prev) => ({ ...prev, image_url: value }));
    };

    const handleSaveConfig = async () => {
        setStatusMsg('Zapisywanie...');
        try {
            const res = await fetch('/api/admin/bot/tickets/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: config, panelEmbed, welcomeEmbed })
            });
            setStatusMsg(res.ok ? 'Zapisano konfiguracje!' : 'Blad zapisu.');
        } catch (e) {
            console.error(e);
            setStatusMsg('Blad zapisu.');
        }
    };

    const handleSendPanel = async () => {
        if (!config.ticketPanelChannelId) {
            alert('Prosze najpierw ustawic ID kanalu panelu ticketow.');
            return;
        }

        try {
            const res = await fetch('/api/admin/bot/tickets/send-panel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: config.ticketPanelChannelId,
                    embedData: panelEmbed
                })
            });
            alert(res.ok ? 'Panel wyslany pomyslnie!' : 'Blad wysylania panelu.');
        } catch (error) {
            console.error(error);
            alert('Blad wysylania panelu.');
        }
    };

    return (
        <div className="ticket-config-container">
            <div className="panel scroll-styled">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>System Ticketow</h2>
                    <button type="button" className="btn btn-success" onClick={handleSaveConfig} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Save size={16} /> Zapisz Konfiguracje
                    </button>
                </div>
                {statusMsg && <p className="text-small text-muted" style={{ textAlign: 'right', marginTop: '5px' }}>{statusMsg}</p>}

                <div className="divider"></div>

                <div className="section">
                    <h3>Konfiguracja</h3>

                    <div className="form-group">
                        <label className="form-label">Kategorie Ticketow</label>
                        <div style={{ background: 'var(--background-tertiary)', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="text-small text-muted">Nazwa</label>
                                    <input
                                        className="form-input"
                                        placeholder="np. Pomoc"
                                        value={newCat.label}
                                        onChange={(e) => setNewCat({ ...newCat, label: e.target.value })}
                                    />
                                </div>
                                <div style={{ width: '60px' }}>
                                    <label className="text-small text-muted">Emoji</label>
                                    <input
                                        className="form-input"
                                        placeholder="🎫"
                                        value={newCat.emoji}
                                        onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="text-small text-muted">Opis</label>
                                    <input
                                        className="form-input"
                                        placeholder="np. Pytania ogolne"
                                        value={newCat.description}
                                        onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                                    />
                                </div>
                                <button type="button" className="btn btn-primary" onClick={addCategory}>Dodaj</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {config.ticketCategories.map((cat) => (
                                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--background-secondary)', padding: '8px', borderRadius: '4px', border: '1px solid var(--background-tertiary)' }}>
                                    <div style={{ fontSize: '20px', marginRight: '10px' }}>{cat.emoji}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{cat.label}</div>
                                        <div className="text-small text-muted">{cat.description}</div>
                                    </div>
                                    <button type="button" className="btn-icon-danger" onClick={() => removeCategory(cat.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {config.ticketCategories.length === 0 && (
                                <p className="text-muted text-small">Brak zdefiniowanych kategorii. Dodaj pierwsza powyzej.</p>
                            )}
                        </div>
                    </div>

                    <div className="divider"></div>

                    <div className="form-group">
                        <label className="form-label">ID Kategorii Ticketow (Gdzie tworzyc kanaly)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={config.ticketCategoryId}
                            onChange={(e) => setConfig({ ...config, ticketCategoryId: e.target.value })}
                            placeholder="np. 123456789012345678"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">ID Roli Supportu (Kto widzi tickety)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={config.supportRoleId}
                            onChange={(e) => setConfig({ ...config, supportRoleId: e.target.value })}
                            placeholder="np. 987654321098765432"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">ID Kanalu Panelu (Gdzie wyslac panel)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={config.ticketPanelChannelId}
                            onChange={(e) => setConfig({ ...config, ticketPanelChannelId: e.target.value })}
                            placeholder="np. 112233445566778899"
                        />
                    </div>
                </div>

                <div className="divider"></div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button type="button"
                        className={`btn ${activeTab === 'panel' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setActiveTab('panel')}
                    >
                        Wyglad Panelu
                    </button>
                    <button type="button"
                        className={`btn ${activeTab === 'welcome' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setActiveTab('welcome')}
                    >
                        Wyglad Powitania (W Ticketach)
                    </button>
                </div>

                <TicketBottomGraphic
                    imageUrl={activeGraphicUrl}
                    label={activeTab === 'panel' ? 'Grafika na dole panelu' : 'Grafika na dole powitania'}
                    onChange={setActiveGraphicUrl}
                />

                {activeTab === 'panel' ? (
                    <div>
                        <div style={{ background: 'var(--background-secondary)', padding: '10px', borderRadius: '5px', marginBottom: '15px', borderLeft: '4px solid var(--blurple)' }}>
                            <p className="text-small">
                                Edytujesz wyglad panelu, ktory bedzie stale widoczny dla uzytkownikow.
                                Przycisk &quot;Stworz Ticket&quot; zostanie dodany automatycznie pod tym embedem.
                            </p>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={handleSendPanel} style={{ marginTop: '10px' }}>
                                <Send size={14} style={{ marginRight: '5px' }} /> Wyslij Panel na Kanal
                            </button>
                        </div>
                        <EmbedForm
                            embedData={panelEmbed}
                            setEmbedData={setPanelEmbed}
                            content=""
                            setContent={() => { }}
                            channelId=""
                            setChannelId={() => { }}
                            onSend={() => { }}
                            isSending={false}
                            statusMessage=""
                            hideActionBar={true}
                            hideChannelSelector={true}
                            hideContentInput={true}
                        />
                    </div>
                ) : (
                    <div>
                        <div style={{ background: 'var(--background-secondary)', padding: '10px', borderRadius: '5px', marginBottom: '15px', borderLeft: '4px solid var(--green)' }}>
                            <p className="text-small">
                                Edytujesz wyglad wiadomosci powitalnej, ktora zobaczy uzytkownik zaraz po utworzeniu ticketa.
                            </p>
                        </div>
                        <EmbedForm
                            embedData={welcomeEmbed}
                            setEmbedData={setWelcomeEmbed}
                            content=""
                            setContent={() => { }}
                            channelId=""
                            setChannelId={() => { }}
                            onSend={() => { }}
                            isSending={false}
                            statusMessage=""
                            hideActionBar={true}
                            hideChannelSelector={true}
                            hideContentInput={true}
                        />
                    </div>
                )}
            </div>

            <div className="preview-panel">
                <div className="preview-header">
                    <h3>Podglad {activeTab === 'panel' ? 'Panelu' : 'Powitania'}</h3>
                    <span>Widok z aplikacji Discord</span>
                </div>
                <div className="preview-content">
                    <EmbedPreview
                        content=""
                        embedData={activeTab === 'panel' ? panelEmbed : welcomeEmbed}
                    >
                        {activeTab === 'panel' && (
                            <div style={{ marginTop: '8px' }}>
                                {config.ticketCategories.length > 0 ? (
                                    <div className="discord-select-menu" style={{
                                        background: '#2f3136',
                                        border: '1px solid #202225',
                                        borderRadius: '4px',
                                        padding: '10px',
                                        color: '#b9bbbe',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'not-allowed'
                                    }}>
                                        <span>Wybierz kategorie zgloszenia...</span>
                                        <span>▼</span>
                                    </div>
                                ) : (
                                    <button type="button" className="discord-btn" style={{ background: '#4f545c', color: 'white' }}>🎫 Stworz Ticket</button>
                                )}
                            </div>
                        )}
                    </EmbedPreview>
                </div>
            </div>
        </div>
    );
}
