'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';

interface TemplateEntry<T> {
    payload: T;
    updatedAt?: string;
}

interface TemplateControlsProps<T> {
    kind: 'embed' | 'components-v2';
    currentPayload: T;
    onLoad: (payload: T) => void;
}

export default function TemplateControls<T>({ kind, currentPayload, onLoad }: TemplateControlsProps<T>) {
    const [templates, setTemplates] = useState<Record<string, TemplateEntry<T>>>({});
    const [selectedName, setSelectedName] = useState('');
    const [newName, setNewName] = useState('');
    const [status, setStatus] = useState('');

    const fetchTemplates = useCallback(async () => {
        const res = await fetch(`/api/admin/bot/templates?kind=${kind}`);
        const data = await res.json();
        setTemplates(data.templates || {});
    }, [kind]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchTemplates();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [fetchTemplates]);

    const saveTemplate = async () => {
        const name = newName.trim() || selectedName.trim();
        if (!name) {
            setStatus('Podaj nazwe szablonu.');
            return;
        }

        const res = await fetch(`/api/admin/bot/templates?kind=${kind}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, payload: currentPayload })
        });

        setStatus(res.ok ? 'Szablon zapisany.' : 'Blad zapisu szablonu.');
        setSelectedName(name);
        setNewName('');
        await fetchTemplates();
    };

    const loadTemplate = () => {
        if (!selectedName || !templates[selectedName]) return;
        onLoad(templates[selectedName].payload);
        setStatus('Szablon zaladowany.');
    };

    const deleteTemplate = async () => {
        if (!selectedName) return;
        const res = await fetch(`/api/admin/bot/templates?kind=${kind}&name=${encodeURIComponent(selectedName)}`, {
            method: 'DELETE'
        });
        setStatus(res.ok ? 'Szablon usuniety.' : 'Blad usuwania szablonu.');
        setSelectedName('');
        await fetchTemplates();
    };

    return (
        <div className="template-controls">
            <div className="form-group">
                <label className="form-label">Szablony</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <select className="form-select" value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>
                        <option value="">Wybierz szablon...</option>
                        {Object.keys(templates).sort().map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button type="button" className="btn btn-secondary" onClick={loadTemplate} aria-disabled={!selectedName}>Wczytaj</button>
                    <button type="button" className="btn-icon-danger" onClick={deleteTemplate} aria-disabled={!selectedName} title="Usun szablon">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    className="form-input"
                    value={newName}
                    placeholder="Nazwa nowego szablonu"
                    onChange={(e) => setNewName(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={saveTemplate}>
                    <Save size={16} /> Zapisz
                </button>
            </div>
            {status && <p className="text-small text-muted" style={{ marginTop: 8 }}>{status}</p>}
        </div>
    );
}

