
import React from 'react';
import { EmbedData } from './types';
import Markdown from './Markdown';

interface EmbedPreviewProps {
    content: string;
    embedData: EmbedData;
    children?: React.ReactNode;
}

export default function EmbedPreview({ content, embedData, children }: EmbedPreviewProps) {
    // Default values for preview
    const botUsername = "Bot Name";
    const botAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";

    const [timeString, setTimeString] = React.useState("");

    React.useEffect(() => {
        const timer = window.setTimeout(() => {
            const today = new Date();
            setTimeString(`Today at ${today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const borderColor = embedData.color || '#202225';

    return (
        <div className="discord-message">
            <div className="avatar" style={{ backgroundImage: `url(${botAvatar})` }}></div>
            <div className="message-content">
                <div className="message-header">
                    <span className="username">{botUsername}</span>
                    <span className="timestamp">{timeString}</span>
                </div>

                {content && <div className="message-text"><Markdown>{content}</Markdown></div>}

                <div className="embed" style={{ borderLeftColor: borderColor }}>
                    <div className="embed-grid">

                        {embedData.author.name && (
                            <div className="embed-author">
                                {embedData.author.icon_url && <img src={embedData.author.icon_url} alt="" className="embed-author-icon" />}
                                <span className="embed-author-name">{embedData.author.name}</span>
                            </div>
                        )}

                        {embedData.title && (
                            embedData.url ?
                                <a href={embedData.url} className="embed-title" target="_blank" rel="noreferrer">{embedData.title}</a> :
                                <span className="embed-title">{embedData.title}</span>
                        )}

                        {embedData.description && (
                            <div className="embed-description"><Markdown>{embedData.description}</Markdown></div>
                        )}

                        {embedData.fields.length > 0 && (
                            <div className="embed-fields">
                                {embedData.fields.map((field) => (
                                    <div key={field.id} className={`embed-field ${field.inline ? 'inline' : ''}`}>
                                        <div className="embed-field-name">{field.name}</div>
                                        <div className="embed-field-value"><Markdown>{field.value}</Markdown></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {embedData.image_url && (
                            <div className="embed-image">
                                <img src={embedData.image_url} alt="Embed Image" />
                            </div>
                        )}

                        {embedData.footer.text && (
                            <div className="embed-footer">
                                {embedData.footer.icon_url && <img src={embedData.footer.icon_url} alt="" className="embed-footer-icon" />}
                                <span className="embed-footer-text">
                                    {embedData.footer.text}
                                    {embedData.timestamp && ` • ${timeString}`}
                                </span>
                            </div>
                        )}
                        {/* Fallback timestamp if no footer text but timestamp is enabled? Discord puts it in footer usually. */}
                        {!embedData.footer.text && embedData.timestamp && (
                            <div className="embed-footer">
                                <span className="embed-footer-text">{timeString}</span>
                            </div>
                        )}

                    </div>

                    {embedData.thumbnail_url && (
                        <img src={embedData.thumbnail_url} alt="Thumbnail" className="embed-thumbnail" />
                    )}
                </div>

                {embedData.buttons && embedData.buttons.length > 0 && (
                    <div className="components-container">
                        <div className="action-row">
                            {embedData.buttons.map((btn, i) => (
                                <button
                                    key={i}
                                    className={`discord-btn discord-btn-${btn.type.toLowerCase()}`}
                                >
                                    {btn.emoji && <span style={{ marginRight: '4px' }}>{btn.emoji}</span>}
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}

