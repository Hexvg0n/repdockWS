import React from 'react';
import { Bold, Italic, Underline, Code, List, Quote, Link as LinkIcon, AtSign, Hash } from 'lucide-react';

interface TextToolbarProps {
    onInsert: (text: string, cursorOffset?: number) => void;
}

export default function TextToolbar({ onInsert }: TextToolbarProps) {
    return (
        <div className="text-toolbar">
            <button type="button" className="toolbar-btn" onClick={() => onInsert('**tekst**', 2)} title="Pogrubienie">
                <Bold size={16} />
            </button>
            <button type="button" className="toolbar-btn" onClick={() => onInsert('*tekst*', 1)} title="Kursywa">
                <Italic size={16} />
            </button>
            <button type="button" className="toolbar-btn" onClick={() => onInsert('__tekst__', 2)} title="Podkreślenie">
                <Underline size={16} />
            </button>
            <button type="button" className="toolbar-btn" onClick={() => onInsert('~~tekst~~', 2)} title="Przekreślenie">
                <span style={{ textDecoration: 'line-through' }}>S</span>
            </button>

            <div className="toolbar-divider" />

            <button type="button" className="toolbar-btn" onClick={() => onInsert('`kod`', 1)} title="Kod liniowy">
                <Code size={16} />
            </button>
            <button type="button" className="toolbar-btn" onClick={() => onInsert('\n```\nblok kodu\n```', 4)} title="Blok kodu">
                <Code size={16} strokeWidth={2.5} />
            </button>
            <button type="button" className="toolbar-btn" onClick={() => onInsert('> ', 0)} title="Cytat">
                <Quote size={16} />
            </button>

            <div className="toolbar-divider" />

            <button type="button" className="toolbar-btn" onClick={() => onInsert('\n- ', 0)} title="Lista punktowana">
                <List size={16} />
            </button>
            <button type="button" className="toolbar-btn" onClick={() => onInsert('[Tytuł](https://)', 1)} title="Link">
                <LinkIcon size={16} />
            </button>

            <div className="toolbar-divider" />

            <button type="button" className="toolbar-btn" onClick={() => onInsert('<@ID_UZYTKOWNIKA>', 2)} title="Oznaczenie Użytkownika">
                <AtSign size={16} />
            </button>
            <button type="button" className="toolbar-btn" onClick={() => onInsert('<#ID_KANALU>', 2)} title="Oznaczenie Kanału">
                <Hash size={16} />
            </button>
        </div>
    );
}

// Helper to insert text into textarea at cursor position
export const insertAtCursor = (
    textarea: HTMLTextAreaElement,
    textToInsert: string,
    cursorOffset: number = 0
): string => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousValue = textarea.value;

    // If text is selected, wrap it?
    // Simplified version: just insert text or wrap selected text
    if (start !== end) {
        const selectedText = previousValue.substring(start, end);
        // Simple heuristic for wrapping: if textToInsert has same start/end chars (like **)
        // But for now, let's keep it simple: just replace/insert. 
        // Improvement: if user selects "foo" and clicks bold (**text**), make it **foo**

        // This logic can be complex for all cases, keeping it simple for now as requested "gotowe formatowanie"
        // Let's try to support wrapping if the insertion string looks like a wrapper (e.g. **tekst**)
        const wrapperMatch = textToInsert.match(/^(\W+)\w+(\W+)$/);
        if (wrapperMatch) {
            const prefix = wrapperMatch[1];
            const suffix = wrapperMatch[2];
            const newValue = previousValue.substring(0, start) + prefix + selectedText + suffix + previousValue.substring(end);
            return newValue;
        }
    }

    const newValue = previousValue.substring(0, start) + textToInsert + previousValue.substring(end);
    return newValue;
};

