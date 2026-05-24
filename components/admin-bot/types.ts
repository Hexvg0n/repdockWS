
export interface EmbedField {
    id: string;
    name: string;
    value: string;
    inline: boolean;
}

export interface EmbedAuthor {
    name: string;
    url: string;
    icon_url: string;
}

export interface EmbedFooter {
    text: string;
    icon_url: string;
}

export interface EmbedData {
    title: string;
    description: string;
    url: string;
    color: string;
    author: EmbedAuthor;
    thumbnail_url: string;
    image_url: string;
    footer: EmbedFooter;
    timestamp: boolean;
    fields: EmbedField[];
    buttons: EmbedButton[];
}

export interface EmbedButton {
    id: string;
    type: 'Link' | 'Primary' | 'Secondary' | 'Success' | 'Danger';
    label: string;
    url?: string;
    emoji?: string;
    custom_id?: string;
}

export type ComponentsV2ButtonStyle = 1 | 2 | 3 | 4 | 5 | 6;

export interface ComponentsV2Emoji {
    id?: string;
    name: string;
    animated?: boolean;
}

export interface ComponentsV2Button {
    type: 2;
    style: ComponentsV2ButtonStyle;
    label: string;
    disabled?: boolean;
    custom_id?: string;
    url?: string;
    sku_id?: string;
    emoji?: ComponentsV2Emoji;
}

export interface ComponentsV2TextDisplay {
    type: 10;
    content: string;
}

export interface ComponentsV2Separator {
    type: 14;
    divider: boolean;
    spacing: 1 | 2;
}

export interface ComponentsV2Thumbnail {
    type: 11;
    media: { url: string };
    description?: string | null;
    spoiler?: boolean;
}

export interface ComponentsV2Section {
    type: 9;
    components: ComponentsV2TextDisplay[];
    accessory: ComponentsV2Button | ComponentsV2Thumbnail;
}

export interface ComponentsV2MediaGalleryItem {
    media: { url: string };
    description?: string | null;
    spoiler?: boolean;
}

export interface ComponentsV2MediaGallery {
    type: 12;
    items: ComponentsV2MediaGalleryItem[];
}

export interface ComponentsV2File {
    type: 13;
    file: { url: string };
    spoiler?: boolean;
}

export interface ComponentsV2StringSelectOption {
    label: string;
    value: string;
    description?: string;
    emoji?: ComponentsV2Emoji;
    default?: boolean;
}

export interface ComponentsV2SelectMenu {
    type: 3 | 5 | 6 | 7 | 8;
    custom_id: string;
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
    options?: ComponentsV2StringSelectOption[];
    channel_types?: number[];
}

export interface ComponentsV2ActionRow {
    type: 1;
    components: Array<ComponentsV2Button | ComponentsV2SelectMenu>;
}

export type ComponentsV2ContainerChild =
    | ComponentsV2ActionRow
    | ComponentsV2File
    | ComponentsV2MediaGallery
    | ComponentsV2TextDisplay
    | ComponentsV2Separator
    | ComponentsV2Section;

export interface ComponentsV2Container {
    type: 17;
    accent_color?: number;
    spoiler?: boolean;
    components: ComponentsV2ContainerChild[];
}

export type ComponentsV2TopLevel =
    | ComponentsV2ActionRow
    | ComponentsV2Container
    | ComponentsV2File
    | ComponentsV2MediaGallery
    | ComponentsV2Section
    | ComponentsV2Separator
    | ComponentsV2TextDisplay;

