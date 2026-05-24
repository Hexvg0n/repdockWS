import React, { useCallback, useEffect, useState } from 'react';
import { EmbedData, EmbedField } from './types';
import { Plus, Trash2, Send, RefreshCw } from 'lucide-react';
import TextToolbar, { insertAtCursor } from './TextToolbar';

interface Channel {
    id: string;
    name: string;
}

interface EmbedFormProps {
    embedData: EmbedData;
    setEmbedData: React.Dispatch<React.SetStateAction<EmbedData>>;
    content: string;
    setContent: (val: string) => void;
    channelId: string;
    setChannelId: (val: string) => void;
    onSend: () => void;
    isSending: boolean;
    statusMessage: string;
    hideActionBar?: boolean;
    hideChannelSelector?: boolean;
    hideContentInput?: boolean;
}

const colorSwatches = [
    "#5865f2",
    "#57f287",
    "#fee75c",
    "#eb459e",
    "#ed4245",
    "#2b2d31",
] as const;

function normalizeHexColor(color: string) {
    return /^#[0-9a-f]{6}$/i.test(color) ? color : "#5865f2";
}

export default function EmbedForm({
    embedData,
    setEmbedData,
    content,
    setContent,
    channelId,
    setChannelId,
    onSend,
    isSending,
    statusMessage,
    hideActionBar = false,
    hideChannelSelector = false,
    hideContentInput = false
}: EmbedFormProps) {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoadingChannels, setIsLoadingChannels] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const normalizedColor = normalizeHexColor(embedData.color);

    // Emoji State
    const [emojis, setEmojis] = useState<any[]>([]);
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);

    const fetchChannels = useCallback(async () => {
        setIsLoadingChannels(true);
        try {
            const res = await fetch('/api/admin/bot/channels');
            const data = await res.json();
            if (data.channels) {
                setChannels(data.channels);
                if (data.channels.length > 0 && !channelId) {
                    setChannelId(data.channels[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch channels", error);
        } finally {
            setIsLoadingChannels(false);
        }
    }, [channelId, setChannelId]);

    const fetchEmojis = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/bot/emojis');
            const data = await res.json();
            if (data.emojis) {
                setEmojis(data.emojis);
            }
        } catch (error) {
            console.error("Failed to fetch emojis", error);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchChannels();
            void fetchEmojis();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [fetchChannels, fetchEmojis]);

    const handleChange = (field: keyof EmbedData, value: any) => {
        setEmbedData(prev => ({ ...prev, [field]: value }));
    };

    const handleAuthorChange = (field: keyof EmbedData['author'], value: string) => {
        setEmbedData(prev => ({
            ...prev,
            author: { ...prev.author, [field]: value }
        }));
    };

    const handleFooterChange = (field: keyof EmbedData['footer'], value: string) => {
        setEmbedData(prev => ({
            ...prev,
            footer: { ...prev.footer, [field]: value }
        }));
    };

    const handleFieldChange = (id: string, field: keyof EmbedField, value: any) => {
        setEmbedData(prev => ({
            ...prev,
            fields: prev.fields.map(f => f.id === id ? { ...f, [field]: value } : f)
        }));
    };

    const addField = () => {
        setEmbedData(prev => ({
            ...prev,
            fields: [...prev.fields, { id: Date.now().toString(), name: "Nazwa Pola", value: "Wartość Pola", inline: false }]
        }));
    };

    const removeField = (id: string) => {
        setEmbedData(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.id !== id)
        }));
    };

    return (
        <div className="form-container">
            {!hideChannelSelector && (
                <>
                    <div className="section">
                        <h2 className="section-title">Konfiguracja</h2>
                        <div className="form-group">
                            <label className="form-label">Wybierz Kanał</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    className="form-select"
                                    value={channelId}
                                    onChange={(e) => setChannelId(e.target.value)}
                                    disabled={isLoadingChannels}
                                >
                                    <option value="" disabled>Wybierz kanał...</option>
                                    {channels.map(ch => (
                                        <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                    ))}
                                </select>
                                <button className="btn btn-secondary" onClick={fetchChannels} disabled={isLoadingChannels} title="Odśwież kanały">
                                    <RefreshCw size={18} className={isLoadingChannels ? "spin" : ""} />
                                </button>
                            </div>
                            {channels.length === 0 && !isLoadingChannels && (
                                <p className="text-muted text-small" style={{ marginTop: '5px' }}>Nie znaleziono kanałów. Sprawdź .env.local.</p>
                            )}
                        </div>
                    </div>
                    <div className="divider"></div>
                </>
            )}

            {!hideContentInput && (
                <>
                    <div className="section">
                        <h2 className="section-title">Treść Wiadomości</h2>
                        <div className="form-group">
                            <label className="form-label">Treść (Poza Embedem)</label>
                            <TextToolbar onInsert={(text, cursorOffset) => {
                                const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
                                if (textarea) {
                                    const newValue = insertAtCursor(textarea, text, cursorOffset);
                                    setContent(newValue);
                                }
                            }} />
                            <textarea
                                id="content-textarea"
                                className="form-textarea"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Wiadomość wysyłana nad embedem..."
                            />
                        </div>
                    </div>
                    <div className="divider"></div>
                </>
            )}

            <div className="section">
                <h2 className="section-title">Szczegóły Embeda</h2>

                <div className="form-group">
                    <label className="form-label">Kolor Paska</label>
                    <div className="color-picker-container" style={{ position: 'relative' }}>
                        <div
                            className="color-preview-btn"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: 'var(--input-background)',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid var(--background-tertiary)',
                                cursor: 'pointer'
                            }}
                        >
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: embedData.color,
                                    borderRadius: '4px',
                                    border: '1px solid rgba(0,0,0,0.1)'
                                }}
                            />
                            <span className="color-code" style={{ flex: 1 }}>{embedData.color}</span>
                        </div>

                        {showColorPicker && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 100 }}>
                                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setShowColorPicker(false)} />
                                <div style={{ position: 'relative', zIndex: 101, background: 'var(--background-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--background-tertiary)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                    <input
                                        type="color"
                                        value={normalizedColor}
                                        onChange={(e) => handleChange('color', e.target.value)}
                                        aria-label="Kolor embeda"
                                        style={{
                                            width: '100%',
                                            height: '92px',
                                            padding: 0,
                                            border: '1px solid var(--background-tertiary)',
                                            borderRadius: '8px',
                                            background: 'transparent',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                                        {colorSwatches.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => handleChange('color', color)}
                                                aria-label={`Ustaw kolor ${color}`}
                                                style={{
                                                    height: '26px',
                                                    backgroundColor: color,
                                                    borderRadius: '6px',
                                                    border: normalizedColor.toLowerCase() === color ? '2px solid white' : '1px solid var(--background-tertiary)',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HEX</span>
                                        <input
                                            type="text"
                                            value={embedData.color}
                                            onChange={(e) => handleChange('color', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '4px',
                                                background: 'var(--input-background)',
                                                border: '1px solid var(--background-tertiary)',
                                                color: 'var(--text-normal)',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <h3 className="form-label">Autor</h3>
                    <div className="flex-row">
                        <input type="text" className="form-input" placeholder="Nazwa Autora" value={embedData.author.name} onChange={e => handleAuthorChange('name', e.target.value)} />
                        <input type="text" className="form-input" placeholder="URL Ikony" value={embedData.author.icon_url} onChange={e => handleAuthorChange('icon_url', e.target.value)} />
                    </div>
                    <input type="text" className="form-input" placeholder="URL Autora (Link)" value={embedData.author.url} onChange={e => handleAuthorChange('url', e.target.value)} style={{ marginTop: '8px' }} />
                </div>

                <div className="form-group">
                    <label className="form-label">Tytuł</label>
                    <input
                        type="text"
                        className="form-input"
                        value={embedData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Tytuł Embeda"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">URL Tytułu</label>
                    <input
                        type="text"
                        className="form-input"
                        value={embedData.url}
                        onChange={(e) => handleChange('url', e.target.value)}
                        placeholder="Link po kliknięciu w tytuł"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Opis</label>
                    <TextToolbar onInsert={(text, cursorOffset) => {
                        const textarea = document.getElementById('desc-textarea') as HTMLTextAreaElement;
                        if (textarea) {
                            const newValue = insertAtCursor(textarea, text, cursorOffset);
                            handleChange('description', newValue);
                        }
                    }} />
                    <textarea
                        id="desc-textarea"
                        className="form-textarea"
                        value={embedData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Główna treść embeda..."
                    />
                </div>

                <div className="flex-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">URL Miniaturki (Prawa Strona)</label>
                        <input type="text" className="form-input" value={embedData.thumbnail_url} onChange={e => handleChange('thumbnail_url', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">URL Obrazka (Duży Na Dole)</label>
                        <input type="text" className="form-input" value={embedData.image_url} onChange={e => handleChange('image_url', e.target.value)} placeholder="https://..." />
                    </div>
                </div>

                <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Pola (Fields)</label>
                        <button className="btn btn-outline btn-sm" onClick={addField}>
                            <Plus size={14} style={{ marginRight: '4px' }} /> Dodaj Pole
                        </button>
                    </div>

                    {embedData.fields.map((field, index) => (
                        <div key={field.id} className="field-row">
                            <div style={{ flex: 1 }}>
                                <input type="text" className="form-input" placeholder="Nazwa" value={field.name} onChange={e => handleFieldChange(field.id, 'name', e.target.value)} />
                            </div>
                            <div style={{ flex: 2 }}>
                                <textarea className="form-textarea field-value" placeholder="Wartość" value={field.value} onChange={e => handleFieldChange(field.id, 'value', e.target.value)} />
                            </div>
                            <div className="field-options">
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={field.inline} onChange={e => handleFieldChange(field.id, 'inline', e.target.checked)} />
                                    Inline
                                </label>
                                <button className="btn-icon-danger" onClick={() => removeField(field.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Przyciski</label>
                        <button className="btn btn-outline btn-sm" onClick={() => {
                            setEmbedData(prev => ({
                                ...prev,
                                buttons: [...(prev.buttons || []), {
                                    id: Date.now().toString(),
                                    type: 'Link' as const,
                                    label: 'Przycisk',
                                    url: '',
                                    emoji: ''
                                }].slice(0, 5) // Max 5 buttons row
                            }));
                        }}>
                            <Plus size={14} style={{ marginRight: '4px' }} /> Dodaj Przycisk
                        </button>
                    </div>

                    {(embedData.buttons || []).map((btn, index) => (
                        <div key={btn.id} className="field-row" style={{ alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div className="button-style-selector" style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                        {[
                                            { type: 'Primary', color: '#5865f2', title: 'Primary (Blurple)' },
                                            { type: 'Secondary', color: '#4f545c', title: 'Secondary (Grey)' },
                                            { type: 'Success', color: '#2d7d46', title: 'Success (Green)' },
                                            { type: 'Danger', color: '#ed4245', title: 'Danger (Red)' },
                                            { type: 'Link', color: '#4f545c', label: '🔗', title: 'Link (URL)' }
                                        ].map((styleOption) => (
                                            <div
                                                key={styleOption.type}
                                                onClick={() => {
                                                    setEmbedData(prev => ({
                                                        ...prev,
                                                        buttons: prev.buttons.map(b => b.id === btn.id ? { ...b, type: styleOption.type as any } : b)
                                                    }));
                                                }}
                                                title={styleOption.title}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    backgroundColor: styleOption.color,
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: btn.type === styleOption.type ? '2px solid white' : '1px solid transparent',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    opacity: btn.type === styleOption.type ? 1 : 0.6
                                                }}
                                            >
                                                {styleOption.label || ''}
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Etykieta"
                                        value={btn.label}
                                        onChange={e => setEmbedData(prev => ({
                                            ...prev,
                                            buttons: prev.buttons.map(b => b.id === btn.id ? { ...b, label: e.target.value } : b)
                                        }))}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {btn.type === 'Link' ? (
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="URL (https://...)"
                                            value={btn.url || ''}
                                            onChange={e => setEmbedData(prev => ({
                                                ...prev,
                                                buttons: prev.buttons.map(b => b.id === btn.id ? { ...b, url: e.target.value } : b)
                                            }))}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Custom ID (Opcjonalne)"
                                            value={btn.custom_id || ''}
                                            onChange={e => setEmbedData(prev => ({
                                                ...prev,
                                                buttons: prev.buttons.map(b => b.id === btn.id ? { ...b, custom_id: e.target.value } : b)
                                            }))}
                                        />
                                    )}

                                    <div style={{ position: 'relative' }}>
                                        <div
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                border: '1px solid var(--background-tertiary)', padding: '10px 12px', borderRadius: '4px', background: 'var(--input-background)',
                                                cursor: 'pointer', height: '42px', minWidth: '80px', maxWidth: '120px'
                                            }}
                                            onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === btn.id ? null : btn.id)}
                                        >
                                            {btn.emoji ? (
                                                btn.emoji.startsWith('<') ? (
                                                    // Try to preview custom emoji if possible
                                                    // Format <:name:id>
                                                    (() => {
                                                        const match = btn.emoji.match(/<a?:(\w+):(\d+)>/);
                                                        if (match) {
                                                            return (
                                                                <>
                                                                    <img src={`https://cdn.discordapp.com/emojis/${match[2]}.webp?size=24&quality=lossless`} alt={match[1]} style={{ width: '20px', height: '20px' }} />
                                                                    <span style={{ fontSize: '12px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '80px' }}>{match[1]}</span>
                                                                </>
                                                            );
                                                        }
                                                        return <span style={{ fontSize: '12px' }}>{btn.emoji}</span>
                                                    })()
                                                ) : <span style={{ fontSize: '18px' }}>{btn.emoji}</span>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Emoji</span>}
                                        </div>

                                        {showEmojiPickerFor === btn.id && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 100,
                                                background: 'var(--background-secondary)', border: '1px solid var(--background-tertiary)', borderRadius: '8px',
                                                padding: '8px', maxHeight: '200px', overflowY: 'auto', width: '250px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                            }}>
                                                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={() => setShowEmojiPickerFor(null)} />
                                                <div style={{ position: 'relative', zIndex: 10 }}>
                                                    <p style={{ fontSize: '12px', color: 'var(--header-secondary)', marginBottom: '8px', fontWeight: 600 }}>Emoji Aplikacji</p>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                                                        {emojis.map(emoji => (
                                                            <div
                                                                key={emoji.id}
                                                                title={emoji.name}
                                                                onClick={() => {
                                                                    const emojiString = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
                                                                    setEmbedData(prev => ({
                                                                        ...prev,
                                                                        buttons: prev.buttons.map(b => b.id === btn.id ? { ...b, emoji: emojiString } : b)
                                                                    }));
                                                                    setShowEmojiPickerFor(null);
                                                                }}
                                                                style={{ cursor: 'pointer', padding: '4px', textAlign: 'center', borderRadius: '4px' }}
                                                                className="emoji-item"
                                                            >
                                                                <img src={`https://cdn.discordapp.com/emojis/${emoji.id}.webp?size=32&quality=lossless`} alt={emoji.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {emojis.length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Brak emoji w aplikacji.</p>}

                                                    <div className="divider" style={{ margin: '8px 0' }} />
                                                    <p style={{ fontSize: '12px', color: 'var(--header-secondary)', marginBottom: '8px', fontWeight: 600 }}>Ręczne (Unicode lub ID)</p>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        style={{ fontSize: '12px', padding: '6px' }}
                                                        placeholder="Wklej emoji/tekst..."
                                                        value=""
                                                        onChange={(e) => {
                                                            setEmbedData(prev => ({
                                                                ...prev,
                                                                buttons: prev.buttons.map(b => b.id === btn.id ? { ...b, emoji: e.target.value } : b)
                                                            }));
                                                        }}
                                                        onBlur={() => setShowEmojiPickerFor(null)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                            <div className="field-options">
                                <button className="btn-icon-danger" onClick={() => setEmbedData(prev => ({
                                    ...prev,
                                    buttons: prev.buttons.filter(b => b.id !== btn.id)
                                }))}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {(embedData.buttons || []).length === 0 && (
                        <p className="text-muted text-small">Możesz dodać maksymalnie 5 przycisków w jednym rzędzie.</p>
                    )}
                </div>

                <div className="form-group">
                    <h3 className="form-label">Stopka (Footer)</h3>
                    <div className="flex-row">
                        <input type="text" className="form-input" placeholder="Tekst Stopki" value={embedData.footer.text} onChange={e => handleFooterChange('text', e.target.value)} />
                        <input type="text" className="form-input" placeholder="URL Ikony Stopki" value={embedData.footer.icon_url} onChange={e => handleFooterChange('icon_url', e.target.value)} />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={embedData.timestamp} onChange={e => handleChange('timestamp', e.target.checked)} />
                            Pokaż Czas wysłania (Timestamp)
                        </label>
                    </div>
                </div>
            </div>

            {!hideActionBar && (
                <div className="action-bar sticky-bottom">
                    <button className="btn btn-primary btn-block" onClick={onSend} disabled={isSending}>
                        {isSending ? (
                            <>
                                <RefreshCw size={18} className="spin" style={{ marginRight: '8px' }} /> Wysyłanie...
                            </>
                        ) : (
                            <>
                                <Send size={18} style={{ marginRight: '8px' }} /> Wyślij Embed
                            </>
                        )}
                    </button>
                    {statusMessage && (
                        <div className={`status-message ${statusMessage.toLowerCase().includes('błąd') || statusMessage.toLowerCase().includes('error') ? 'error' : 'success'}`}>
                            {statusMessage}
                        </div>
                    )}
                </div>
            )}
        </div >
    );
}

