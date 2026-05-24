export function getDiscordBotToken() {
  return process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN ?? "";
}

export function getDiscordGuildId() {
  return process.env.DISCORD_GUILD_ID ?? "";
}

export function hexColorToNumber(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseInt(value.replace("#", "").trim(), 16);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildDiscordEmbed(embedData: Record<string, any> = {}) {
  const embed: Record<string, any> = {};
  const color = hexColorToNumber(embedData.color);

  if (embedData.title) embed.title = embedData.title;
  if (embedData.description) embed.description = embedData.description;
  if (embedData.url) embed.url = embedData.url;
  if (typeof color === "number") embed.color = color;

  if (embedData.author?.name) {
    embed.author = {
      name: embedData.author.name,
      icon_url: embedData.author.icon_url || undefined,
      url: embedData.author.url || undefined,
    };
  }

  if (embedData.thumbnail_url) embed.thumbnail = { url: embedData.thumbnail_url };
  if (embedData.image_url) embed.image = { url: embedData.image_url };

  if (embedData.footer?.text) {
    embed.footer = {
      text: embedData.footer.text,
      icon_url: embedData.footer.icon_url || undefined,
    };
  }

  if (embedData.timestamp) {
    embed.timestamp = new Date().toISOString();
  }

  if (Array.isArray(embedData.fields)) {
    embed.fields = embedData.fields
      .filter((field: Record<string, unknown>) => field.name && field.value)
      .map((field: Record<string, unknown>) => ({
        name: field.name,
        value: field.value,
        inline: Boolean(field.inline),
      }));
  }

  return embed;
}

export function parseDiscordEmoji(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const customEmojiMatch = value.match(/<a?:(\w+):(\d+)>/);

  if (customEmojiMatch) {
    return {
      name: customEmojiMatch[1],
      id: customEmojiMatch[2],
    };
  }

  if (/^\d{17,20}$/.test(value)) {
    return { id: value };
  }

  return { name: value };
}

export function buildButtonComponents(embedData: Record<string, any> = {}) {
  if (!Array.isArray(embedData.buttons) || embedData.buttons.length === 0) {
    return [];
  }

  const styleMap: Record<string, number> = {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5,
  };

  return [
    {
      type: 1,
      components: embedData.buttons.slice(0, 5).map((button: Record<string, any>) => {
        const buttonObject: Record<string, any> = {
          type: 2,
          style: styleMap[button.type] || 1,
          label: button.label || "Button",
        };

        if (button.type === "Link") {
          buttonObject.url = button.url;
        } else {
          buttonObject.custom_id =
            button.custom_id || `btn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }

        const emoji = parseDiscordEmoji(button.emoji);
        if (emoji) {
          buttonObject.emoji = emoji;
        }

        return buttonObject;
      }),
    },
  ];
}

export function buildTicketPanelComponents(categories: Array<Record<string, any>>) {
  if (categories.length > 0) {
    return [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: "create_ticket_select",
            placeholder: "Wybierz kategorie zgloszenia...",
            options: categories.slice(0, 25).map((category) => ({
              label: category.label,
              value: category.value,
              description: category.description || undefined,
              emoji: parseDiscordEmoji(category.emoji),
            })),
          },
        ],
      },
    ];
  }

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: "Stworz Ticket",
          custom_id: "create_ticket",
        },
      ],
    },
  ];
}
