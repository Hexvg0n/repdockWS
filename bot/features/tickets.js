const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { loadConfig } = require('../utils/config');
const { getTicketNumber } = require('../utils/ticketCounter');
const {
    closeTicket: markTicketClosed,
    findOpenTicket,
    getTicket,
    removeTicket,
    upsertTicket
} = require('../utils/ticketState');

const TICKET_INTERACTION_IDS = new Set([
    'create_ticket_select',
    'create_ticket',
    'close_ticket',
    'close_ticket_modal',
    'confirm_close',
    'cancel_close',
    'claim_ticket'
]);

function normalizeChannelNamePart(value) {
    return String(value || 'ticket')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'ticket';
}

function selectedCategoryName(interaction) {
    const selectedValue = interaction.isStringSelectMenu() ? interaction.values[0] : 'ticket';

    switch (selectedValue) {
        case 'general': return 'ogolne';
        case 'website': return 'strona';
        case 'package': return 'paczka';
        case 'collaboration': return 'wspolpraca';
        default: return normalizeChannelNamePart(selectedValue);
    }
}

function isSupportMember(interaction, config) {
    if (interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) return true;
    if (!config?.ids?.supportRoleId) return false;
    return interaction.member?.roles?.cache?.has(config.ids.supportRoleId) || false;
}

function canCloseTicket(interaction, ticket, config) {
    return isSupportMember(interaction, config) || ticket?.userId === interaction.user.id;
}

async function fetchConfiguredTarget(guild, config) {
    const category = await guild.channels.fetch(config.ids.ticketCategoryId).catch(() => null);
    if (!category || category.type !== ChannelType.GuildCategory) {
        return { error: 'Kategoria ticketow nie istnieje albo nie jest kategoria Discord.' };
    }

    if (config.ids.supportRoleId) {
        const supportRole = await guild.roles.fetch(config.ids.supportRoleId).catch(() => null);
        if (!supportRole) return { error: 'Rola supportu z konfiguracji nie istnieje na serwerze.' };
    }

    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return { error: 'Bot nie ma uprawnienia Manage Channels.' };
    }

    return { category };
}

async function findExistingTicketChannel(guild, userId, config) {
    const stateTicket = findOpenTicket(guild.id, userId);
    if (stateTicket?.channelId) {
        const channel = await guild.channels.fetch(stateTicket.channelId).catch(() => null);
        if (channel) return channel;
        removeTicket(stateTicket.channelId);
    }

    const categoryId = config?.ids?.ticketCategoryId;
    const channels = guild.channels.cache.filter((channel) => (
        channel.type === ChannelType.GuildText
        && (!categoryId || channel.parentId === categoryId)
        && channel.topic?.includes(`(${userId})`)
    ));

    return channels.first() || null;
}

async function fetchTranscriptMessages(channel, maxMessages = 1000) {
    const messages = [];
    let before;

    while (messages.length < maxMessages) {
        const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
        if (!batch || batch.size === 0) break;

        messages.push(...batch.values());
        before = batch.last().id;
        if (batch.size < 100) break;
    }

    return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

async function buildTranscript(channel, ticket, reason, closedBy) {
    const messages = await fetchTranscriptMessages(channel);
    const header = [
        `Transcript: #${channel.name}`,
        `Channel ID: ${channel.id}`,
        `User ID: ${ticket?.userId || 'unknown'}`,
        `Category: ${ticket?.categoryName || 'unknown'}`,
        `Claimed by: ${ticket?.claimedBy || 'none'}`,
        `Closed by: ${closedBy.tag} (${closedBy.id})`,
        `Reason: ${reason || 'Brak powodu'}`,
        `Generated at: ${new Date().toISOString()}`,
        '',
        '--- Messages ---'
    ];

    const lines = messages.map((message) => {
        const attachments = message.attachments.size > 0
            ? `\nAttachments: ${message.attachments.map((attachment) => attachment.url).join(', ')}`
            : '';
        const embeds = message.embeds.length > 0 ? `\nEmbeds: ${message.embeds.length}` : '';
        return `[${message.createdAt.toISOString()}] ${message.author?.tag || 'Unknown'} (${message.author?.id || 'unknown'}): ${message.cleanContent || '[no text]'}${attachments}${embeds}`;
    });

    const content = [...header, ...lines].join('\n');
    return new AttachmentBuilder(Buffer.from(content, 'utf8'), { name: `transcript-${channel.id}.txt` });
}

async function sendTicketLog(guild, config, ticket, channel, closedBy, reason, transcript) {
    const logChannelId = config?.ids?.ticketLogChannelId || config?.ids?.ticketPanelChannelId;
    if (!logChannelId) return;

    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setTitle('Ticket zamkniety')
        .setColor('#ed4245')
        .addFields(
            { name: 'Kanal', value: `#${channel.name}\n${channel.id}`, inline: true },
            { name: 'Uzytkownik', value: ticket?.userId ? `<@${ticket.userId}>` : 'Nieznany', inline: true },
            { name: 'Zamknal', value: `${closedBy}\n${closedBy.tag}`, inline: true },
            { name: 'Kategoria', value: ticket?.categoryName || 'N/A', inline: true },
            { name: 'Przejal', value: ticket?.claimedBy ? `<@${ticket.claimedBy}>` : 'Nikt', inline: true },
            { name: 'Powod', value: reason || 'Brak powodu' }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [embed], files: [transcript] }).catch(console.error);
}

function buildCloseModal() {
    const modal = new ModalBuilder()
        .setCustomId('close_ticket_modal')
        .setTitle('Zamknij ticket');

    const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Powod zamkniecia')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Opisz krotko powod zamkniecia ticketa')
        .setRequired(false)
        .setMaxLength(900);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    return modal;
}

async function finalizeClose(interaction, client, config, reason) {
    const channel = interaction.channel;
    const ticket = getTicket(channel.id) || {};

    if (!canCloseTicket(interaction, ticket, config)) {
        const payload = { content: 'Nie masz uprawnien do zamkniecia tego ticketa.', flags: MessageFlags.Ephemeral };
        if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(console.error);
        else await interaction.reply(payload).catch(console.error);
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const transcript = await buildTranscript(channel, ticket, reason, interaction.user);
    markTicketClosed(channel.id, {
        closedBy: interaction.user.id,
        closeReason: reason || 'Brak powodu'
    });

    await sendTicketLog(interaction.guild, config, ticket, channel, interaction.user, reason, transcript);
    await interaction.editReply({ content: 'Transcript zapisany. Kanal zostanie usuniety za 5 sekund.' }).catch(console.error);

    setTimeout(() => {
        channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason || 'No reason'}`).catch((error) => console.log('Could not delete channel', error));
    }, 5000);
}

async function handleSetupTickets(interaction, channel) {
    const embed = new EmbedBuilder()
        .setColor('#FFFFFF')
        .setDescription(`
\`\`\` RepDock - Centrum Pomocy \`\`\`
 **Witaj w systemie pomocy!**
> Prosimy o cierpliwosc oraz zachowanie kultury w zgloszeniach.
> Aby otworzyc ticket i uzyskac wsparcie, wybierz odpowiednia kategorie z menu ponizej.
`)
        .setImage('https://i.imgur.com/5ZE3s3g.gif')
        .setThumbnail('https://i.imgur.com/gW77fKi.gif')
        .setFooter({ text: 'RepDock Support' });

    const select = new StringSelectMenuBuilder()
        .setCustomId('create_ticket_select')
        .setPlaceholder('Wybierz kategorie zgloszenia')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Ogolne').setDescription('Pytania ogolne i inne tematy').setValue('general'),
            new StringSelectMenuOptionBuilder().setLabel('Strona').setDescription('Zglos problem lub sugestie zwiazana ze strona').setValue('website'),
            new StringSelectMenuOptionBuilder().setLabel('Paczka').setDescription('Pytanie o status lub problem z wysylka').setValue('package'),
            new StringSelectMenuOptionBuilder().setLabel('Wspolpraca').setDescription('Propozycje wspolpracy i partnerstwa').setValue('collaboration')
        );

    await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
    await interaction.reply({ content: 'Panel ticketow zostal wyslany!', flags: MessageFlags.Ephemeral });
}

async function handleTicketInteraction(interaction, client) {
    const { customId, guild, user, channel } = interaction;

    if (customId === 'setup_select_action') {
        if (!interaction.isStringSelectMenu() || interaction.values[0] !== 'setup_tickets') return false;
        await handleSetupTickets(interaction, channel);
        return true;
    }

    if (!TICKET_INTERACTION_IDS.has(customId)) return false;

    if (!guild) {
        await interaction.reply({ content: 'Tickety dzialaja tylko na serwerze.', flags: MessageFlags.Ephemeral });
        return true;
    }

    const config = loadConfig();

    if (customId === 'create_ticket_select' || customId === 'create_ticket') {
        if (!config?.ids?.ticketCategoryId) {
            await interaction.reply({ content: 'System ticketow nie jest skonfigurowany: brakuje ID kategorii.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await createTicket(interaction, guild, user, client, config, selectedCategoryName(interaction));
        return true;
    }

    if (customId === 'close_ticket') {
        const ticket = getTicket(channel.id) || {};
        if (!canCloseTicket(interaction, ticket, config)) {
            await interaction.reply({ content: 'Nie masz uprawnien do zamkniecia tego ticketa.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.showModal(buildCloseModal());
        return true;
    }

    if (customId === 'close_ticket_modal') {
        const reason = interaction.fields.getTextInputValue('close_reason') || 'Brak powodu';
        await finalizeClose(interaction, client, config, reason);
        return true;
    }

    if (customId === 'confirm_close') {
        await interaction.update({ content: 'Zamykanie ticketa...', components: [] }).catch(console.error);
        await finalizeClose(interaction, client, config, 'Brak powodu');
        return true;
    }

    if (customId === 'cancel_close') {
        await interaction.update({ content: 'Anulowano zamkniecie.', components: [] });
        return true;
    }

    if (customId === 'claim_ticket') {
        const ticket = getTicket(channel.id) || {};
        if (!isSupportMember(interaction, config)) {
            await interaction.reply({ content: 'Tylko support moze przejac ticket.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id) {
            await interaction.reply({ content: `Ten ticket jest juz przejety przez <@${ticket.claimedBy}>.`, flags: MessageFlags.Ephemeral });
            return true;
        }

        upsertTicket(channel.id, { claimedBy: interaction.user.id, claimedAt: new Date().toISOString(), status: 'open' });
        await interaction.reply({ content: `Ticket przejety przez ${interaction.user}.` });
        return true;
    }

    return false;
}

async function createTicket(interaction, guild, user, client, config, categoryName) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        const existingChannel = await findExistingTicketChannel(guild, user.id, config);
        if (existingChannel) {
            await interaction.editReply({ content: `Masz juz otwarty ticket: ${existingChannel}` });
            return;
        }

        const target = await fetchConfiguredTarget(guild, config);
        if (target.error) {
            await interaction.editReply({ content: `Nie mozna utworzyc ticketa: ${target.error}` });
            return;
        }

        const ticketNumber = getTicketNumber();
        const channelName = `${ticketNumber}-${normalizeChannelNamePart(user.username)}-${categoryName}`.substring(0, 100);

        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: target.category.id,
            topic: `Zgloszenie od: ${user.tag} (${user.id}) | Kategoria: ${categoryName}`,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                {
                    id: user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageChannels
                    ]
                },
                ...(config.ids.supportRoleId ? [{
                    id: config.ids.supportRoleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }] : [])
            ]
        });

        upsertTicket(ticketChannel.id, {
            guildId: guild.id,
            userId: user.id,
            userTag: user.tag,
            categoryName,
            status: 'open',
            createdAt: new Date().toISOString()
        });

        const welcomeEmbedData = config.welcomeEmbed || {};
        const color = welcomeEmbedData.color ? Number.parseInt(welcomeEmbedData.color.replace('#', ''), 16) : 0x57f287;

        const embed = new EmbedBuilder()
            .setTitle(welcomeEmbedData.title || 'Witaj w zgloszeniu!')
            .setDescription(welcomeEmbedData.description || 'Opisz swoj problem, a czlonek zespolu wkrotce Ci pomoze.')
            .setColor(Number.isFinite(color) ? color : 0x57f287);

        if (welcomeEmbedData.footer?.text) {
            embed.setFooter({ text: welcomeEmbedData.footer.text, iconURL: welcomeEmbedData.footer.icon_url || undefined });
        } else {
            embed.setFooter({ text: 'RepDock Support' });
        }

        if (welcomeEmbedData.thumbnail_url) embed.setThumbnail(welcomeEmbedData.thumbnail_url);
        if (welcomeEmbedData.image_url) embed.setImage(welcomeEmbedData.image_url);
        if (welcomeEmbedData.timestamp !== false) embed.setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Zamknij Ticket').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Przejmij Ticket').setStyle(ButtonStyle.Success)
            );

        await ticketChannel.send({
            content: `<@${user.id}> ${config.ids.supportRoleId ? `<@&${config.ids.supportRoleId}>` : ''}`,
            embeds: [embed],
            components: [row]
        });

        await interaction.editReply({ content: `Twoj ticket zostal utworzony: ${ticketChannel}` });
    } catch (error) {
        console.error('Error creating ticket:', error);

        const message = 'Wystapil blad podczas tworzenia ticketa.';
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: message }).catch(console.error);
        } else {
            await interaction.reply({ content: message, flags: MessageFlags.Ephemeral }).catch(console.error);
        }
    }
}

module.exports = { handleTicketInteraction };
