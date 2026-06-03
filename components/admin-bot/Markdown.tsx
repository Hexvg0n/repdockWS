import SmartImage from "@/components/SmartImage";
import React from 'react';

interface MarkdownProps {
    children: string;
}

function hashKey(value: string) {
    let hash = 0;
    for (let offset = 0; offset < value.length; offset++) {
        hash = (hash * 31 + value.charCodeAt(offset)) >>> 0;
    }
    return hash.toString(36);
}

function markdownKey(prefix: string, match: string, offset: number) {
    return `${prefix}-${hashKey(`${offset}:${match}`)}`;
}

export default function Markdown({ children }: MarkdownProps) {
    if (!children) return null;

    // We proceed by replacing patterns with HTML-like logic or React nodes.
    // Since React security prevents innerHTML by default, we'll parse it into an array of nodes.

    // Simple parser approach:
    // Split by regex and map.
    // Order of operations matters: Code blocks -> Inline Code -> Spoilers -> Bold/Italic/Underline/Strike

    // However, robust parsing is hard with just regex split. 
    // Let's use a simpler approach: replace known patterns with specific markers, then split and render?
    // Or just "good enough" regex replacement for preview purposes.

    // Let's implement a recursive parser for better nesting support or a simple chain for basic support.
    // Providing "Discord-like" often implies just the basics.

    // Let's try to handle: 
    // 1. ```block```
    // 2. `inline`
    // 3. ||spoiler||
    // 4. **bold**
    // 5. *italic* / _italic_
    // 6. __underline__
    // 7. ~~strike~~

    let elements: (string | React.JSX.Element)[] = [children];

    const process = (regex: RegExp, wrapper: (match: string, offset: number) => React.JSX.Element | string) => {
        const newElements: (string | React.JSX.Element)[] = [];
        elements.forEach(el => {
            if (typeof el === 'string') {
                // Using split with capturing group: 
                // "a **b** c".split(/(\*\*.*?\*\*)/) -> ["a ", "**b**", " c"]

                const splitParts = el.split(regex);
                const testRegex = new RegExp(regex.source, regex.flags.replace('g', ''));
                let searchFrom = 0;

                for (let i = 0; i < splitParts.length; i++) {
                    const part = splitParts[i];
                    const offset = part ? el.indexOf(part, searchFrom) : searchFrom;
                    if (offset >= 0) searchFrom = offset + part.length;
                    // Logic to detect if this part matches the pattern or is surrounding text
                    // If regex has capturing group, odd indices are matches (usually)

                    if (testRegex.test(part) || (i % 2 !== 0 && splitParts.length > 1)) {
                        // It's a match/capture
                        // We need to strip markers for content? 
                        // Wrapper should handle it.
                        newElements.push(wrapper(part, offset));
                    } else {
                        if (part) newElements.push(part);
                    }
                }

            } else {
                newElements.push(el);
            }
        });
        elements = newElements;
    };

    // Code Blocks ```...```
    // Note: split regex must capture the *entire* match to preserve it in the array for processing
    process(/```([\s\S]*?)```/g, (match, offset) => {
        // match includes ```...```, we need to strip
        const content = match.slice(3, -3);
        return <pre key={markdownKey('codeblock', match, offset)} className="discord-pre"><code>{content}</code></pre>;
    });

    // Inline Code `...`
    process(/(`[^`]+`)/g, (match, offset) => {
        const content = match.slice(1, -1);
        return <code key={markdownKey('code', match, offset)} className="discord-code">{content}</code>;
    });

    // Spoiler ||...||
    process(/(\|\|.*?\|\|)/g, (match, offset) => {
        const content = match.slice(2, -2);
        return <span key={markdownKey('spoiler', match, offset)} className="discord-spoiler" title="Spoiler">{content}</span>;
    });

    // Bold **...**
    process(/(\*\*.*?\*\*)/g, (match, offset) => {
        return <strong key={markdownKey('bold', match, offset)}>{match.slice(2, -2)}</strong>;
    });

    // Underline __...__
    process(/(__.*?__)/g, (match, offset) => {
        return <u key={markdownKey('u', match, offset)}>{match.slice(2, -2)}</u>;
    });

    // Strikethrough ~~...~~
    process(/(~~.*?~~)/g, (match, offset) => {
        return <s key={markdownKey('s', match, offset)}>{match.slice(2, -2)}</s>;
    });

    // Custom Emoji <:name:id> or <a:name:id>
    process(/<(a?):(\w+):(\d+)>/g, (match, offset) => {
        // match: <a:name:id>
        // regex match array from exec/string.match: [full, a?, name, id]
        // But here we might just get the string match if using previous logic. 
        // We need to re-parse the match string to get ID.
        const parts = match.match(/<(a?):(\w+):(\d+)>/);
        if (parts) {
            const animated = parts[1] === 'a';
            const name = parts[2];
            const id = parts[3];
            const ext = animated ? 'gif' : 'png';
            const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
            return (
                <SmartImage
                    key={markdownKey('emoji', match, offset)}
                    src={url}
                    alt={`:${name}:`}
                    className="discord-emoji"
                    title={`:${name}:`}
                />
            );
        }
        return match;
    });

    // User Mention <@id> or <@!id>
    process(/<@!?(\d+)>/g, (match, offset) => {
        return <span key={markdownKey('user', match, offset)} className="discord-mention">@User</span>;
    });

    // Channel Mention <#id>
    process(/<#(\d+)>/g, (match, offset) => {
        return <span key={markdownKey('channel', match, offset)} className="discord-mention">#channel</span>;
    });

    // Role Mention <@&id>
    process(/<@&(\d+)>/g, (match, offset) => {
        return <span key={markdownKey('role', match, offset)} className="discord-mention">@Role</span>;
    });

    // Italic *...* (Simple version, ignores _ for now to avoid complexity)
    process(/(\*.*?\*)/g, (match, offset) => {
        return <em key={markdownKey('em', match, offset)}>{match.slice(1, -1)}</em>;
    });

    // Render array
    return <>{elements}</>;
}
