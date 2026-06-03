import SmartImage from "@/components/SmartImage";
import React from 'react';
import Markdown from './Markdown';
import {
    ComponentsV2ActionRow,
    ComponentsV2Button,
    ComponentsV2Container,
    ComponentsV2ContainerChild,
    ComponentsV2File,
    ComponentsV2MediaGallery,
    ComponentsV2Section,
    ComponentsV2SelectMenu,
    ComponentsV2Thumbnail,
    ComponentsV2TopLevel
} from './types';

interface ComponentsV2PreviewProps {
    components: ComponentsV2TopLevel[];
}

function colorToHex(color?: number) {
    return `#${(color ?? 0x22d3ee).toString(16).padStart(6, '0')}`;
}

function hashKey(value: unknown) {
    const input = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
    let hash = 0;

    for (let offset = 0; offset < input.length; offset++) {
        hash = (hash * 31 + input.charCodeAt(offset)) >>> 0;
    }

    return hash.toString(36);
}

function componentKey(prefix: string, value: unknown) {
    if (value && typeof value === 'object') {
        const draftKey = (value as { _clientKey?: unknown })._clientKey;
        if (typeof draftKey === 'string') return draftKey;
    }

    return `${prefix}-${hashKey(value)}`;
}

function buttonClass(button: ComponentsV2Button) {
    const map: Record<number, string> = {
        1: 'primary',
        2: 'secondary',
        3: 'success',
        4: 'danger',
        5: 'link',
        6: 'secondary'
    };
    return `discord-btn discord-btn-${map[button.style] || 'secondary'}`;
}

function emojiText(button: ComponentsV2Button) {
    if (!button.emoji) return '';
    if (button.emoji.id) return `<${button.emoji.animated ? 'a' : ''}:${button.emoji.name}:${button.emoji.id}>`;
    return button.emoji.name;
}

function renderButton(button: ComponentsV2Button) {
    const emoji = emojiText(button);

    return (
        <button type="button" className={buttonClass(button)} disabled={button.disabled} key={componentKey('button', button)}>
            {emoji && <span style={{ marginRight: 6 }}>{emoji}</span>}
            {button.label || (button.style === 6 ? 'Premium' : 'Button')}
        </button>
    );
}

function renderSelect(select: ComponentsV2SelectMenu) {
    const labelMap: Record<number, string> = {
        3: 'String select',
        5: 'User select',
        6: 'Role select',
        7: 'Mentionable select',
        8: 'Channel select'
    };

    return (
        <div className="v2-select" key={componentKey('select', select)}>
            <span>{select.placeholder || labelMap[select.type] || 'Select menu'}</span>
            <span>v</span>
        </div>
    );
}

function renderActionRow(row: ComponentsV2ActionRow) {
    return (
        <div className="action-row" key={componentKey('row', row)}>
            {row.components.map((component) => (
                component.type === 2
                    ? renderButton(component)
                    : renderSelect(component)
            ))}
        </div>
    );
}

function renderThumbnail(thumbnail: ComponentsV2Thumbnail) {
    return (
        <div className={`v2-thumbnail ${thumbnail.spoiler ? 'spoiler' : ''}`}>
            {thumbnail.media?.url ? <SmartImage src={thumbnail.media.url} alt={thumbnail.description || 'Thumbnail'} /> : <span>Thumbnail</span>}
        </div>
    );
}

function renderMediaGallery(gallery: ComponentsV2MediaGallery) {
    return (
        <div className="v2-gallery" key={componentKey('gallery', gallery)}>
            {gallery.items.map((item, itemIndex) => (
                <div className={`v2-gallery-item ${item.spoiler ? 'spoiler' : ''}`} key={componentKey('gallery-item', item)}>
                    {item.media?.url ? <SmartImage src={item.media.url} alt={item.description || `Media ${itemIndex + 1}`} /> : <span>Media</span>}
                    {item.description && <div className="v2-gallery-caption">{item.description}</div>}
                </div>
            ))}
        </div>
    );
}

function renderFile(file: ComponentsV2File) {
    return (
        <div className={`v2-file ${file.spoiler ? 'spoiler' : ''}`} key={componentKey('file', file)}>
            <span>File</span>
            <code>{file.file?.url || 'attachment://file.ext'}</code>
        </div>
    );
}

function renderSection(section: ComponentsV2Section) {
    return (
        <div className="v2-section" key={componentKey('section', section)}>
            <div className="v2-section-text">
                {section.components.map((text) => (
                    <div className="v2-text" key={componentKey('section-text', text)}>
                        <Markdown>{text.content}</Markdown>
                    </div>
                ))}
            </div>
            <div className="v2-section-accessory">
                {section.accessory.type === 2 ? renderButton(section.accessory) : renderThumbnail(section.accessory)}
            </div>
        </div>
    );
}

function renderChild(child: ComponentsV2ContainerChild) {
    if (child.type === 1) return renderActionRow(child);
    if (child.type === 10) {
        return (
            <div className="v2-text" key={componentKey('text', child)}>
                <Markdown>{child.content}</Markdown>
            </div>
        );
    }
    if (child.type === 14) {
        return (
            <div
                key={componentKey('separator', child)}
                className={`v2-separator ${child.divider ? 'with-line' : ''} ${child.spacing === 2 ? 'large' : ''}`}
            />
        );
    }
    if (child.type === 9) return renderSection(child);
    if (child.type === 12) return renderMediaGallery(child);
    if (child.type === 13) return renderFile(child);

    return null;
}

function renderTopLevel(component: ComponentsV2TopLevel) {
    if (component.type === 17) {
        const container = component as ComponentsV2Container;
        return (
            <div
                className={`v2-container ${container.spoiler ? 'spoiler' : ''}`}
                style={{ borderLeftColor: colorToHex(container.accent_color || undefined) }}
                key={componentKey('container', container)}
            >
                {container.components.map(renderChild)}
            </div>
        );
    }

    return renderChild(component as ComponentsV2ContainerChild);
}

export default function ComponentsV2Preview({ components }: Readonly<ComponentsV2PreviewProps>) {
    return (
        <div className="discord-message v2-message">
            <div className="avatar" style={{ backgroundImage: 'url(https://cdn.discordapp.com/embed/avatars/0.png)' }} />
            <div className="message-content">
                <div className="message-header">
                    <span className="username">RepDock Bot</span>
                    <span className="timestamp">Components V2</span>
                </div>
                <div className="v2-stack">
                    {components.map(renderTopLevel)}
                </div>
            </div>
        </div>
    );
}
