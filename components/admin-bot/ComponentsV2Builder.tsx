'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Copy, Plus, Send, Trash2, Upload } from 'lucide-react';
import ComponentsV2Preview from './ComponentsV2Preview';
import TemplateControls from './TemplateControls';
import {
    ComponentsV2ActionRow,
    ComponentsV2Button,
    ComponentsV2ButtonStyle,
    ComponentsV2Container,
    ComponentsV2ContainerChild,
    ComponentsV2File,
    ComponentsV2MediaGallery,
    ComponentsV2MediaGalleryItem,
    ComponentsV2Section,
    ComponentsV2SelectMenu,
    ComponentsV2Separator,
    ComponentsV2StringSelectOption,
    ComponentsV2TextDisplay,
    ComponentsV2Thumbnail,
    ComponentsV2TopLevel
} from './types';

interface Channel {
    id: string;
    name: string;
}

type ComponentList = Array<ComponentsV2TopLevel | ComponentsV2ContainerChild>;
type AttachmentMap = Record<string, File>;

let clientKeyCounter = 0;

function createClientKey(prefix: string) {
    clientKeyCounter += 1;
    return `${prefix}_${Date.now().toString(36)}_${clientKeyCounter}`;
}

function withFreshClientKey<T extends object>(value: T, prefix: string): T & { _clientKey: string } {
    return { ...value, _clientKey: createClientKey(prefix) };
}

function withClientKey<T extends object & { _clientKey?: string }>(value: T, key: string): T & { _clientKey: string } {
    if (value._clientKey) return value as T & { _clientKey: string };
    return { ...value, _clientKey: key };
}

function hydrateSelectOptionKeys(options: ComponentsV2StringSelectOption[] | undefined, path: string) {
    return options?.map((option, index) => withClientKey(option, `${path}_option_${index}`));
}

function hydrateActionComponentKeys(component: ComponentsV2Button | ComponentsV2SelectMenu, path: string) {
    if (component.type === 2) return withClientKey(component, path);
    return {
        ...withClientKey(component, path),
        options: hydrateSelectOptionKeys(component.options, path)
    };
}

function hydrateComponentKeys<T extends ComponentsV2TopLevel | ComponentsV2ContainerChild>(component: T, path: string): T {
    const keyed = withClientKey(component, path);

    if (keyed.type === 17) {
        return {
            ...keyed,
            components: keyed.components.map((child, index) => hydrateComponentKeys(child, `${path}_child_${index}`))
        } as T;
    }

    if (keyed.type === 1) {
        return {
            ...keyed,
            components: keyed.components.map((child, index) => hydrateActionComponentKeys(child, `${path}_action_${index}`))
        } as T;
    }

    if (keyed.type === 9) {
        return {
            ...keyed,
            accessory: keyed.accessory.type === 2
                ? hydrateActionComponentKeys(keyed.accessory, `${path}_accessory`)
                : withClientKey(keyed.accessory, `${path}_thumbnail`),
            components: keyed.components.map((text, index) => withClientKey(text, `${path}_text_${index}`))
        } as T;
    }

    if (keyed.type === 12) {
        return {
            ...keyed,
            items: keyed.items.map((item, index) => withClientKey(item, `${path}_media_${index}`))
        } as T;
    }

    return keyed;
}

function hydrateComponentList<T extends ComponentsV2TopLevel | ComponentsV2ContainerChild>(components: T[], path: string): T[] {
    return components.map((component, index) => hydrateComponentKeys(component, `${path}_${index}`));
}

function stripClientKeys<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(stripClientKeys) as T;
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => key !== '_clientKey')
                .map(([key, item]) => [key, stripClientKeys(item)])
        ) as T;
    }

    return value;
}

const DEFAULT_COMPONENTS: ComponentsV2TopLevel[] = [
    {
        type: 17,
        _clientKey: 'default_container',
        accent_color: 0x87ccab,
        components: [
            { type: 10, _clientKey: 'default_heading', content: '# <:mapp:1460396801260523726> x TRACKING!' },
            { type: 14, _clientKey: 'default_separator', divider: true, spacing: 1 },
            {
                type: 9,
                _clientKey: 'default_section',
                components: [
                    { type: 10, _clientKey: 'default_section_text', content: '> <:602327arrow:1460390014620930129> Uzyj komendy `/tracking` lub kliknij przycisk ponizej, aby sprawdzic status swojej paczki!' }
                ],
                accessory: {
                    type: 2,
                    _clientKey: 'default_tracking_button',
                    style: 2,
                    label: 'Sprawdz paczke',
                    custom_id: 'tracking_check_package',
                    emoji: { id: '1460396801260523726', name: 'mapp' }
                }
            }
        ]
    }
];

function hexToNumber(hex: string) {
    const parsed = Number.parseInt(hex.replace('#', '').trim(), 16);
    return Number.isFinite(parsed) ? parsed : 0x22d3ee;
}

function numberToHex(value?: number | null) {
    return `#${(value ?? 0x22d3ee).toString(16).padStart(6, '0')}`;
}

function makeButton(style: ComponentsV2ButtonStyle = 2): ComponentsV2Button {
    const button: ComponentsV2Button = {
        type: 2,
        style,
        label: style === 5 ? 'Otworz link' : 'Kliknij'
    };

    if (style === 5) button.url = 'https://example.com';
    else if (style === 6) button.sku_id = '';
    else button.custom_id = `action_${Date.now()}`;

    return withFreshClientKey(button, 'button');
}

function makeSelect(type: ComponentsV2SelectMenu['type'] = 3): ComponentsV2SelectMenu {
    const select: ComponentsV2SelectMenu = {
        type,
        custom_id: `select_${Date.now()}`,
        placeholder: 'Wybierz opcje...',
        min_values: 1,
        max_values: 1
    };

    if (type === 3) {
        select.options = [
            withFreshClientKey({ label: 'Opcja 1', value: 'option_1', description: 'Pierwsza opcja' }, 'select_option'),
            withFreshClientKey({ label: 'Opcja 2', value: 'option_2', description: 'Druga opcja' }, 'select_option')
        ];
    }

    return withFreshClientKey(select, 'select');
}

function makeText(): ComponentsV2TextDisplay {
    return withFreshClientKey({ type: 10, content: '## Nowy blok tekstu' }, 'text');
}

function makeSeparator(): ComponentsV2Separator {
    return withFreshClientKey({ type: 14, divider: true, spacing: 1 as const }, 'separator');
}

function makeThumbnail(): ComponentsV2Thumbnail {
    return withFreshClientKey({ type: 11, media: { url: 'https://placehold.co/128x128/png' }, description: 'Thumbnail' }, 'thumbnail');
}

function makeSection(accessory: 'button' | 'thumbnail' = 'button'): ComponentsV2Section {
    return {
        type: 9,
        _clientKey: createClientKey('section'),
        components: [withFreshClientKey({ type: 10, content: '> Opis akcji po lewej stronie.' }, 'section_text')],
        accessory: accessory === 'button' ? makeButton(2) : makeThumbnail()
    };
}

function makeGallery(): ComponentsV2MediaGallery {
    return {
        type: 12,
        _clientKey: createClientKey('gallery'),
        items: [
            withFreshClientKey({ media: { url: 'https://placehold.co/640x360/png' }, description: 'Media item' }, 'gallery_item')
        ]
    };
}

function makeFile(): ComponentsV2File {
    return withFreshClientKey({ type: 13, file: { url: 'attachment://plik.pdf' } }, 'file');
}

function makeActionRow(mode: 'buttons' | 'select' = 'buttons'): ComponentsV2ActionRow {
    return {
        type: 1,
        _clientKey: createClientKey('action_row'),
        components: mode === 'buttons' ? [makeButton(2)] : [makeSelect(3)]
    };
}

function makeContainer(): ComponentsV2Container {
    return {
        type: 17,
        _clientKey: createClientKey('container'),
        accent_color: 0x22d3ee,
        components: [makeText(), makeSeparator(), makeSection('button')]
    };
}

function makeSelectOption(value: string): ComponentsV2StringSelectOption {
    return withFreshClientKey({ label: 'Opcja', value }, 'select_option');
}

function makeGalleryItem(): ComponentsV2MediaGalleryItem {
    return withFreshClientKey({ media: { url: 'https://placehold.co/640x360/png' } }, 'gallery_item');
}

function labelForComponent(component: ComponentsV2TopLevel | ComponentsV2ContainerChild) {
    const labels: Record<number, string> = {
        1: 'Action Row',
        9: 'Section',
        10: 'Text Display',
        12: 'Media Gallery',
        13: 'File',
        14: 'Separator',
        17: 'Container'
    };
    return labels[component.type] || `Type ${component.type}`;
}

function styleLabel(style: ComponentsV2ButtonStyle) {
    const labels: Record<number, string> = {
        1: 'Primary',
        2: 'Secondary',
        3: 'Success',
        4: 'Danger',
        5: 'Link',
        6: 'Premium'
    };
    return labels[style];
}

function selectLabel(type: ComponentsV2SelectMenu['type']) {
    const labels: Record<number, string> = {
        3: 'String Select',
        5: 'User Select',
        6: 'Role Select',
        7: 'Mentionable Select',
        8: 'Channel Select'
    };
    return labels[type];
}

function parseNumberCsv(value: string) {
    return value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item));
}

function attachmentNameFromUrl(url?: string) {
    if (!url?.startsWith('attachment://')) return null;
    return url.slice('attachment://'.length);
}

function collectAttachmentNames(value: unknown) {
    const names = new Set<string>();

    const walk = (item: unknown) => {
        if (typeof item === 'string') {
            const name = attachmentNameFromUrl(item);
            if (name) names.add(name);
            return;
        }

        if (Array.isArray(item)) {
            item.forEach(walk);
            return;
        }

        if (item && typeof item === 'object') {
            Object.values(item).forEach(walk);
        }
    };

    walk(value);
    return names;
}

function normalizeImportedPayload(raw: any): ComponentsV2TopLevel[] {
    const components = Array.isArray(raw) ? raw : raw.components;
    if (!Array.isArray(components) || components.length === 0) {
        throw new Error('JSON musi zawierac tablice components');
    }

    return hydrateComponentList(components, 'imported') as ComponentsV2TopLevel[];
}

function validateComponents(components: ComponentsV2TopLevel[], attachmentNames: Set<string>) {
    const warnings: string[] = [];

    const validateAttachment = (url: string | undefined, label: string) => {
        const name = attachmentNameFromUrl(url);
        if (name && !attachmentNames.has(name)) {
            warnings.push(`${label}: attachment://${name} wymaga wgrania pliku w tym panelu przed wysylka.`);
        }
    };

    if (components.length > 40) warnings.push('Discord ma limit liczby komponentow w wiadomosci. Rozwaz podzial panelu.');

    const walk = (list: ComponentList, scope: string) => {
        list.forEach((component, index) => {
            if (component.type === 17) {
                if (component.components.length > 10) warnings.push(`${scope} Container #${index + 1}: max 10 dzieci.`);
                walk(component.components, `${scope} Container #${index + 1}`);
            }

            if (component.type === 9) {
                if (component.components.length < 1 || component.components.length > 3) warnings.push(`${scope} Section #${index + 1}: 1-3 teksty.`);
            }

            if (component.type === 12 && (component.items.length < 1 || component.items.length > 10)) {
                warnings.push(`${scope} Media Gallery #${index + 1}: 1-10 elementow.`);
            }

            if (component.type === 13 && !component.file.url.startsWith('attachment://')) {
                warnings.push(`${scope} File #${index + 1}: Discord wymaga attachment://filename i realnego uploadu pliku.`);
            }

            if (component.type === 13) validateAttachment(component.file.url, `${scope} File #${index + 1}`);
            if (component.type === 12) {
                component.items.forEach((item, itemIndex) => validateAttachment(item.media.url, `${scope} Media #${index + 1}.${itemIndex + 1}`));
            }
            if (component.type === 9 && component.accessory.type === 11) {
                validateAttachment(component.accessory.media.url, `${scope} Section #${index + 1} thumbnail`);
            }

            if (component.type === 1) {
                const selects = component.components.filter((child) => child.type !== 2);
                const buttons = component.components.filter((child) => child.type === 2);
                if (selects.length > 1 || (selects.length === 1 && buttons.length > 0)) {
                    warnings.push(`${scope} Action Row #${index + 1}: select musi byc sam w row.`);
                }
                if (buttons.length > 5) warnings.push(`${scope} Action Row #${index + 1}: max 5 przyciskow.`);
            }
        });
    };

    walk(components, 'Top');
    return warnings;
}

function AddButtons({ onAdd, allowContainer }: { onAdd: (component: ComponentsV2TopLevel | ComponentsV2ContainerChild) => void; allowContainer: boolean }) {
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {allowContainer && <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeContainer())}><Plus size={14} /> Container</button>}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeText())}><Plus size={14} /> Text</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeSeparator())}><Plus size={14} /> Separator</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeSection('button'))}><Plus size={14} /> Section Button</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeSection('thumbnail'))}><Plus size={14} /> Section Thumbnail</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeGallery())}><Plus size={14} /> Gallery</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeFile())}><Plus size={14} /> File</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeActionRow('buttons'))}><Plus size={14} /> Button Row</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(makeActionRow('select'))}><Plus size={14} /> Select Row</button>
        </div>
    );
}

function AttachmentInput({ label, onUpload }: { label: string; onUpload: (file: File) => void }) {
    return (
        <label className="btn btn-outline btn-sm" style={{ width: 'fit-content' }}>
            <Upload size={14} /> {label}
            <input
                type="file"
                style={{ display: 'none' }}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    onUpload(file);
                    event.target.value = '';
                }}
            />
        </label>
    );
}

function EmojiEditor({ button, onChange }: { button: ComponentsV2Button; onChange: (button: ComponentsV2Button) => void }) {
    return (
        <div className="flex-row">
            <input
                className="form-input"
                value={button.emoji?.name || ''}
                placeholder="Emoji name albo Unicode"
                onChange={(e) => onChange({ ...button, emoji: e.target.value ? { ...(button.emoji || {}), name: e.target.value } : undefined })}
            />
            <input
                className="form-input"
                value={button.emoji?.id || ''}
                placeholder="Emoji ID"
                onChange={(e) => onChange({ ...button, emoji: { ...(button.emoji || { name: '' }), id: e.target.value || undefined } })}
            />
        </div>
    );
}

function ButtonEditor({ button, onChange }: { button: ComponentsV2Button; onChange: (button: ComponentsV2Button) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="flex-row">
                <input
                    className="form-input"
                    value={button.label || ''}
                    placeholder="Label"
                    onChange={(e) => onChange({ ...button, label: e.target.value })}
                />
                <select
                    className="form-select"
                    value={button.style}
                    onChange={(e) => {
                        const style = Number(e.target.value) as ComponentsV2ButtonStyle;
                        const next = makeButton(style);
                        onChange({ ...button, ...next, style, label: button.label || next.label });
                    }}
                >
                    {[1, 2, 3, 4, 5, 6].map((style) => (
                        <option value={style} key={style}>{styleLabel(style as ComponentsV2ButtonStyle)}</option>
                    ))}
                </select>
            </div>

            {button.style === 5 ? (
                <input className="form-input" value={button.url || ''} placeholder="https://..." onChange={(e) => onChange({ ...button, url: e.target.value, custom_id: undefined, sku_id: undefined })} />
            ) : button.style === 6 ? (
                <input className="form-input" value={button.sku_id || ''} placeholder="SKU ID" onChange={(e) => onChange({ ...button, sku_id: e.target.value, custom_id: undefined, url: undefined })} />
            ) : (
                <input className="form-input" value={button.custom_id || ''} placeholder="custom_id" onChange={(e) => onChange({ ...button, custom_id: e.target.value, url: undefined, sku_id: undefined })} />
            )}

            <EmojiEditor button={button} onChange={onChange} />
            <label className="checkbox-label">
                <input type="checkbox" checked={!!button.disabled} onChange={(e) => onChange({ ...button, disabled: e.target.checked })} />
                Disabled
            </label>
        </div>
    );
}

function ThumbnailEditor({
    thumbnail,
    onChange,
    onAttach
}: {
    thumbnail: ComponentsV2Thumbnail;
    onChange: (thumbnail: ComponentsV2Thumbnail) => void;
    onAttach: (file: File) => string;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="form-input" value={thumbnail.media.url} placeholder="Image URL albo attachment://image.png" onChange={(e) => onChange({ ...thumbnail, media: { url: e.target.value } })} />
            <input className="form-input" value={thumbnail.description || ''} placeholder="Alt text" onChange={(e) => onChange({ ...thumbnail, description: e.target.value || undefined })} />
            <AttachmentInput label="Upload obraz" onUpload={(file) => onChange({ ...thumbnail, media: { url: onAttach(file) } })} />
            <label className="checkbox-label">
                <input type="checkbox" checked={!!thumbnail.spoiler} onChange={(e) => onChange({ ...thumbnail, spoiler: e.target.checked })} />
                Spoiler
            </label>
        </div>
    );
}

function SelectEditor({ select, onChange }: { select: ComponentsV2SelectMenu; onChange: (select: ComponentsV2SelectMenu) => void }) {
    const options = select.options || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="flex-row">
                <select className="form-select" value={select.type} onChange={(e) => onChange(makeSelect(Number(e.target.value) as ComponentsV2SelectMenu['type']))}>
                    {[3, 5, 6, 7, 8].map((type) => <option key={type} value={type}>{selectLabel(type as ComponentsV2SelectMenu['type'])}</option>)}
                </select>
                <input className="form-input" value={select.custom_id} placeholder="custom_id" onChange={(e) => onChange({ ...select, custom_id: e.target.value })} />
            </div>
            <input className="form-input" value={select.placeholder || ''} placeholder="Placeholder" onChange={(e) => onChange({ ...select, placeholder: e.target.value || undefined })} />
            <div className="flex-row">
                <input className="form-input" type="number" value={select.min_values ?? 1} min={0} max={25} onChange={(e) => onChange({ ...select, min_values: Number(e.target.value) })} />
                <input className="form-input" type="number" value={select.max_values ?? 1} min={1} max={25} onChange={(e) => onChange({ ...select, max_values: Number(e.target.value) })} />
            </div>
            <label className="checkbox-label">
                <input type="checkbox" checked={!!select.disabled} onChange={(e) => onChange({ ...select, disabled: e.target.checked })} />
                Disabled
            </label>

            {select.type === 8 && (
                <input
                    className="form-input"
                    value={select.channel_types?.join(',') || ''}
                    placeholder="Channel types CSV, np. 0,2,4"
                    onChange={(e) => onChange({ ...select, channel_types: e.target.value ? parseNumberCsv(e.target.value) : undefined })}
                />
            )}

            {select.type === 3 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <label className="form-label" style={{ margin: 0 }}>Opcje string select</label>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange({ ...select, options: [...options, makeSelectOption(`option_${options.length + 1}`)] })}>Dodaj opcje</button>
                    </div>
                    {options.map((option, optionIndex) => (
                        <div className="v2-editor-subblock" key={option._clientKey || option.value}>
                            <input className="form-input" value={option.label} placeholder="Label" onChange={(e) => {
                                const next = [...options];
                                next[optionIndex] = { ...option, label: e.target.value };
                                onChange({ ...select, options: next });
                            }} />
                            <input className="form-input" value={option.value} placeholder="Value" onChange={(e) => {
                                const next = [...options];
                                next[optionIndex] = { ...option, value: e.target.value };
                                onChange({ ...select, options: next });
                            }} />
                            <input className="form-input" value={option.description || ''} placeholder="Description" onChange={(e) => {
                                const next = [...options];
                                next[optionIndex] = { ...option, description: e.target.value || undefined };
                                onChange({ ...select, options: next });
                            }} />
                            <div className="flex-row">
                                <input className="form-input" value={option.emoji?.name || ''} placeholder="Emoji name albo Unicode" onChange={(e) => {
                                    const next = [...options];
                                    next[optionIndex] = e.target.value
                                        ? { ...option, emoji: { ...(option.emoji || {}), name: e.target.value } }
                                        : { ...option, emoji: undefined };
                                    onChange({ ...select, options: next });
                                }} />
                                <input className="form-input" value={option.emoji?.id || ''} placeholder="Emoji ID" onChange={(e) => {
                                    const next = [...options];
                                    next[optionIndex] = { ...option, emoji: { ...(option.emoji || { name: '' }), id: e.target.value || undefined } };
                                    onChange({ ...select, options: next });
                                }} />
                            </div>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={!!option.default} onChange={(e) => {
                                    const next = [...options];
                                    next[optionIndex] = { ...option, default: e.target.checked };
                                    onChange({ ...select, options: next });
                                }} />
                                Domyslna opcja
                            </label>
                            <button type="button" className="btn-icon-danger" onClick={() => onChange({ ...select, options: options.filter((_, index) => index !== optionIndex) })}><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SectionEditor({
    section,
    onChange,
    onAttach
}: {
    section: ComponentsV2Section;
    onChange: (section: ComponentsV2Section) => void;
    onAttach: (file: File) => string;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0 }}>Teksty sekcji</label>
                <button type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => onChange({ ...section, components: [...section.components, withFreshClientKey({ type: 10 as const, content: '> Kolejny tekst' }, 'section_text')].slice(0, 3) })}
                >
                    Dodaj tekst
                </button>
            </div>

            {section.components.map((text, index) => (
                <div className="v2-editor-subblock" key={text._clientKey || text.content}>
                    <textarea className="form-textarea" value={text.content} onChange={(e) => {
                        const next = [...section.components];
                        next[index] = { ...text, content: e.target.value };
                        onChange({ ...section, components: next });
                    }} />
                    <button type="button" className="btn-icon-danger" onClick={() => onChange({ ...section, components: section.components.filter((_, textIndex) => textIndex !== index) })}><Trash2 size={16} /></button>
                </div>
            ))}

            <div className="flex-row">
                <button type="button" className={`btn ${section.accessory.type === 2 ? 'btn-primary' : 'btn-outline'}`} onClick={() => onChange({ ...section, accessory: makeButton(2) })}>Button accessory</button>
                <button type="button" className={`btn ${section.accessory.type === 11 ? 'btn-primary' : 'btn-outline'}`} onClick={() => onChange({ ...section, accessory: makeThumbnail() })}>Thumbnail accessory</button>
            </div>

            {section.accessory.type === 2
                ? <ButtonEditor button={section.accessory} onChange={(accessory) => onChange({ ...section, accessory })} />
                : <ThumbnailEditor thumbnail={section.accessory} onAttach={onAttach} onChange={(accessory) => onChange({ ...section, accessory })} />}
        </div>
    );
}

function MediaGalleryEditor({
    gallery,
    onChange,
    onAttach
}: {
    gallery: ComponentsV2MediaGallery;
    onChange: (gallery: ComponentsV2MediaGallery) => void;
    onAttach: (file: File) => string;
}) {
    return (
        <div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange({ ...gallery, items: [...gallery.items, makeGalleryItem()].slice(0, 10) })}>Dodaj media</button>
            {gallery.items.map((item, index) => (
                <div className="v2-editor-subblock" key={item._clientKey || item.media.url}>
                    <input className="form-input" value={item.media.url} placeholder="Media URL albo attachment://image.png" onChange={(e) => {
                        const next = [...gallery.items];
                        next[index] = { ...item, media: { url: e.target.value } };
                        onChange({ ...gallery, items: next });
                    }} />
                    <AttachmentInput label="Upload media" onUpload={(file) => {
                        const next = [...gallery.items];
                        next[index] = { ...item, media: { url: onAttach(file) } };
                        onChange({ ...gallery, items: next });
                    }} />
                    <input className="form-input" value={item.description || ''} placeholder="Alt text" onChange={(e) => {
                        const next = [...gallery.items];
                        next[index] = { ...item, description: e.target.value || undefined };
                        onChange({ ...gallery, items: next });
                    }} />
                    <label className="checkbox-label">
                        <input type="checkbox" checked={!!item.spoiler} onChange={(e) => {
                            const next = [...gallery.items];
                            next[index] = { ...item, spoiler: e.target.checked };
                            onChange({ ...gallery, items: next });
                        }} />
                        Spoiler
                    </label>
                    <button type="button" className="btn-icon-danger" onClick={() => onChange({ ...gallery, items: gallery.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={16} /></button>
                </div>
            ))}
        </div>
    );
}

function ActionRowEditor({ row, onChange }: { row: ComponentsV2ActionRow; onChange: (row: ComponentsV2ActionRow) => void }) {
    const hasSelect = row.components.some((component) => component.type !== 2);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="flex-row">
                <button type="button" className={`btn ${!hasSelect ? 'btn-primary' : 'btn-outline'}`} onClick={() => onChange(makeActionRow('buttons'))}>Buttons row</button>
                <button type="button" className={`btn ${hasSelect ? 'btn-primary' : 'btn-outline'}`} onClick={() => onChange(makeActionRow('select'))}>Select row</button>
            </div>

            {!hasSelect && (
                <>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange({ ...row, components: [...row.components, makeButton(2)].slice(0, 5) })}>Dodaj przycisk</button>
                    {row.components.map((component, index) => component.type === 2 && (
                        <div className="v2-editor-subblock" key={component._clientKey || component.custom_id || component.url || component.label}>
                            <ButtonEditor button={component} onChange={(button) => {
                                const next = [...row.components];
                                next[index] = button;
                                onChange({ ...row, components: next });
                            }} />
                            <button type="button" className="btn-icon-danger" onClick={() => onChange({ ...row, components: row.components.filter((_, componentIndex) => componentIndex !== index) })}><Trash2 size={16} /></button>
                        </div>
                    ))}
                </>
            )}

            {hasSelect && row.components[0]?.type !== 2 && (
                <SelectEditor select={row.components[0]} onChange={(select) => onChange({ ...row, components: [select] })} />
            )}
        </div>
    );
}

function ComponentEditor({
    component,
    onChange,
    onRemove,
    onAttach
}: {
    component: ComponentsV2TopLevel | ComponentsV2ContainerChild;
    onChange: (component: ComponentsV2TopLevel | ComponentsV2ContainerChild) => void;
    onRemove: () => void;
    onAttach: (file: File) => string;
}) {
    return (
        <div className="v2-editor-block">
            <div className="v2-editor-block-header">
                <strong>{labelForComponent(component)}</strong>
                <button type="button" className="btn-icon-danger" onClick={onRemove}><Trash2 size={16} /></button>
            </div>

            {component.type === 17 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="flex-row">
                        <input type="color" value={numberToHex(component.accent_color)} onChange={(e) => onChange({ ...component, accent_color: hexToNumber(e.target.value) })} />
                        <label className="checkbox-label">
                            <input type="checkbox" checked={!!component.spoiler} onChange={(e) => onChange({ ...component, spoiler: e.target.checked })} />
                            Spoiler
                        </label>
                    </div>
                    <ComponentListEditor
                        components={component.components}
                        allowContainer={false}
                        onAttach={onAttach}
                        onChange={(children) => onChange({ ...component, components: children as ComponentsV2ContainerChild[] })}
                    />
                </div>
            )}

            {component.type === 10 && (
                <textarea className="form-textarea" value={component.content} onChange={(e) => onChange({ ...component, content: e.target.value })} />
            )}

            {component.type === 14 && (
                <div className="flex-row">
                    <label className="checkbox-label">
                        <input type="checkbox" checked={component.divider} onChange={(e) => onChange({ ...component, divider: e.target.checked })} />
                        Divider
                    </label>
                    <select className="form-select" value={component.spacing} onChange={(e) => onChange({ ...component, spacing: Number(e.target.value) as 1 | 2 })}>
                        <option value={1}>Small spacing</option>
                        <option value={2}>Large spacing</option>
                    </select>
                </div>
            )}

            {component.type === 9 && <SectionEditor section={component} onAttach={onAttach} onChange={onChange as (component: ComponentsV2Section) => void} />}
            {component.type === 12 && <MediaGalleryEditor gallery={component} onAttach={onAttach} onChange={onChange as (component: ComponentsV2MediaGallery) => void} />}
            {component.type === 13 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input className="form-input" value={component.file.url} placeholder="attachment://filename.ext" onChange={(e) => onChange({ ...component, file: { url: e.target.value } })} />
                    <AttachmentInput label="Upload plik" onUpload={(file) => onChange({ ...component, file: { url: onAttach(file) } })} />
                    <label className="checkbox-label">
                        <input type="checkbox" checked={!!component.spoiler} onChange={(e) => onChange({ ...component, spoiler: e.target.checked })} />
                        Spoiler
                    </label>
                </div>
            )}
            {component.type === 1 && <ActionRowEditor row={component} onChange={onChange as (component: ComponentsV2ActionRow) => void} />}
        </div>
    );
}

function ComponentListEditor({
    components,
    onChange,
    allowContainer,
    onAttach
}: {
    components: ComponentList;
    onChange: (components: ComponentList) => void;
    allowContainer: boolean;
    onAttach: (file: File) => string;
}) {
    return (
        <div>
            <AddButtons onAdd={(component) => onChange([...components, component])} allowContainer={allowContainer} />
            {components.map((component, index) => (
                <ComponentEditor
                    key={component._clientKey || `${component.type}_${JSON.stringify(stripClientKeys(component))}`}
                    component={component}
                    onChange={(next) => onChange(components.map((item, itemIndex) => itemIndex === index ? next : item))}
                    onRemove={() => onChange(components.filter((_, itemIndex) => itemIndex !== index))}
                    onAttach={onAttach}
                />
            ))}
        </div>
    );
}

export default function ComponentsV2Builder() {
    const [components, setComponents] = useState<ComponentsV2TopLevel[]>(DEFAULT_COMPONENTS);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [channelId, setChannelId] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [advancedJson, setAdvancedJson] = useState('');
    const [useAdvancedJson, setUseAdvancedJson] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentMap>({});

    const payloadComponents = useMemo(() => {
        if (!useAdvancedJson) return components;
        try {
            return normalizeImportedPayload(JSON.parse(advancedJson));
        } catch {
            return components;
        }
    }, [advancedJson, components, useAdvancedJson]);

    const exportedJson = useMemo(() => JSON.stringify({ flags: 32768, components: stripClientKeys(payloadComponents) }, null, 2), [payloadComponents]);
    const attachmentNames = useMemo(() => new Set(Object.keys(attachments)), [attachments]);
    const warnings = useMemo(() => validateComponents(payloadComponents as ComponentsV2TopLevel[], attachmentNames), [payloadComponents, attachmentNames]);

    const handleAttach = useCallback((file: File) => {
        setAttachments((current) => ({ ...current, [file.name]: file }));
        return `attachment://${file.name}`;
    }, []);

    const fetchChannels = useCallback(async () => {
        const res = await fetch('/api/admin/bot/channels');
        const data = await res.json();
        if (Array.isArray(data.channels)) {
            setChannels(data.channels);
            if (!channelId && data.channels[0]) setChannelId(data.channels[0].id);
        }
    }, [channelId]);

    React.useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchChannels();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [fetchChannels]);

    const importJson = () => {
        try {
            const imported = normalizeImportedPayload(JSON.parse(jsonInput));
            setComponents(imported);
            setAdvancedJson(JSON.stringify({ flags: 32768, components: stripClientKeys(imported) }, null, 2));
            setStatusMessage('JSON zaimportowany.');
        } catch (error: any) {
            setStatusMessage(`Blad importu: ${error.message}`);
        }
    };

    const sendPanel = async () => {
        if (!channelId) {
            setStatusMessage('Wybierz kanal docelowy.');
            return;
        }

        let componentsToSend = stripClientKeys(payloadComponents);
        let rawPayload: unknown = null;
        let payloadForAttachments: unknown = componentsToSend;
        if (useAdvancedJson) {
            try {
                rawPayload = stripClientKeys(JSON.parse(advancedJson));
                componentsToSend = normalizeImportedPayload(rawPayload);
                payloadForAttachments = rawPayload;
            } catch (error: any) {
                setStatusMessage(`Blad raw JSON: ${error.message}`);
                return;
            }
        }

        const referencedAttachments = Array.from(collectAttachmentNames(payloadForAttachments));
        const missingAttachments = referencedAttachments.filter((name) => !attachments[name]);
        if (missingAttachments.length > 0) {
            setStatusMessage(`Brakuje wgranych plikow: ${missingAttachments.join(', ')}`);
            return;
        }
        const filesToSend = referencedAttachments.map((name) => attachments[name]).filter((file): file is File => !!file);

        setIsSending(true);
        setStatusMessage('');

        try {
            const request: RequestInit = { method: 'POST' };

            if (filesToSend.length > 0) {
                const formData = new FormData();
                formData.append('channelId', channelId);
                if (useAdvancedJson) {
                    formData.append('payload', JSON.stringify(rawPayload));
                } else {
                    formData.append('components', JSON.stringify(stripClientKeys(componentsToSend)));
                }
                filesToSend.forEach((file) => formData.append('files', file, file.name));
                request.body = formData;
            } else {
                request.headers = { 'Content-Type': 'application/json' };
                request.body = JSON.stringify(useAdvancedJson ? { channelId, payload: rawPayload } : { channelId, components: stripClientKeys(componentsToSend) });
            }

            const res = await fetch('/api/admin/bot/components-v2/send', {
                ...request
            });
            const data = await res.json();
            setStatusMessage(res.ok ? 'Components V2 wyslane.' : `Blad wysylki: ${data.error}`);
        } catch (error: any) {
            setStatusMessage(`Blad wysylki: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="components-v2-container">
            <div className="panel scroll-styled">
                <h1 className="app-title">Components V2 Builder</h1>

                <div className="section">
                    <h2 className="section-title">Wysylka</h2>
                    <div className="form-group">
                        <label className="form-label">Kanal</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="form-select" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                                <option value="" disabled>Wybierz kanal...</option>
                                {channels.map((channel) => <option value={channel.id} key={channel.id}>#{channel.name}</option>)}
                            </select>
                            <button type="button" className="btn btn-secondary" onClick={fetchChannels}>Odswiez</button>
                        </div>
                    </div>
                    {warnings.length > 0 && (
                        <div className="v2-warning-list">
                            {warnings.map((warning) => <div key={warning}>{warning}</div>)}
                        </div>
                    )}
                    {Object.keys(attachments).length > 0 && (
                        <div className="text-small text-muted" style={{ marginTop: 10 }}>
                            Pliki do wysylki: {Object.keys(attachments).join(', ')}
                        </div>
                    )}
                </div>

                <div className="section">
                    <h2 className="section-title">Szablony V2</h2>
                    <TemplateControls
                        kind="components-v2"
                        currentPayload={{ flags: 32768, components: stripClientKeys(payloadComponents) }}
                        onLoad={(payload: any) => {
                            const loaded = normalizeImportedPayload(payload);
                            setComponents(loaded);
                            setAdvancedJson(JSON.stringify({ flags: 32768, components: stripClientKeys(loaded) }, null, 2));
                        }}
                    />
                </div>

                <div className="section">
                    <h2 className="section-title">Komponenty</h2>
                    <ComponentListEditor
                        components={components}
                        allowContainer={true}
                        onAttach={handleAttach}
                        onChange={(next) => setComponents(next as ComponentsV2TopLevel[])}
                    />
                </div>

                <div className="section">
                    <h2 className="section-title">Raw API JSON</h2>
                    <label className="checkbox-label" style={{ marginBottom: 8 }}>
                        <input type="checkbox" checked={useAdvancedJson} onChange={(e) => {
                            setUseAdvancedJson(e.target.checked);
                            if (e.target.checked && !advancedJson) setAdvancedJson(exportedJson);
                        }} />
                        Uzyj raw JSON przy wysylce
                    </label>
                    <textarea
                        className="form-textarea"
                        value={advancedJson}
                        placeholder="Tu mozesz wkleic dowolny payload zgodny z Discord Components V2..."
                        onChange={(e) => setAdvancedJson(e.target.value)}
                        style={{ minHeight: 150 }}
                    />
                </div>

                <div className="section">
                    <h2 className="section-title">Import / Export</h2>
                    <textarea
                        className="form-textarea"
                        value={jsonInput}
                        placeholder="Wklej JSON z Discorda albo caly payload..."
                        onChange={(e) => setJsonInput(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className="btn btn-secondary" onClick={importJson}><Upload size={16} /> Import</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setJsonInput(exportedJson)}><Copy size={16} /> Export</button>
                    </div>
                </div>

                <div className="action-bar sticky-bottom">
                    <button type="button" className="btn btn-primary btn-block" onClick={sendPanel} disabled={isSending}>
                        <Send size={18} style={{ marginRight: 8 }} /> {isSending ? 'Wysylanie...' : 'Wyslij Components V2'}
                    </button>
                    {statusMessage && (
                        <div className={`status-message ${statusMessage.toLowerCase().includes('blad') ? 'error' : 'success'}`}>
                            {statusMessage}
                        </div>
                    )}
                </div>
            </div>

            <div className="preview-panel">
                <div className="preview-header">
                    <h3>Podglad Components V2</h3>
                    <span>IS_COMPONENTS_V2</span>
                </div>
                <div className="preview-content">
                    <ComponentsV2Preview components={payloadComponents as ComponentsV2TopLevel[]} />
                </div>
            </div>
        </div>
    );
}

