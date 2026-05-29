const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // Construct the welcome embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#FFFFFF') // Cyan color similar to the image
            .setDescription(`
\`\`\` RepDock ✗ BBDBuy \`\`\`

> 👋 Cześć <@${member.id}>!

> Dziękujemy, że dołączyłeś do naszej społeczności **${member.guild.name}**!

> Pamiętaj, że rejestrując się z tego linku otrzymasz **masę kuponów o wartości aż 300$**
> [Kliknij tutaj, aby się zarejestrować](https://www.bbdbuyeu.com/register?inviteCode=uvlItn)

> Nie przegap okazji

> Miłego pobytu na serwerze życzy administracja **${member.guild.name}**!
            `)
            .setThumbnail(member.guild.iconURL({ dynamic: true }) || member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({
                text: `${member.guild.name} • Automatyczne powitanie`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        try {
            await member.send({ embeds: [welcomeEmbed] });
            console.log(`Sent welcome DM to ${member.user.tag}`);
        } catch (error) {
            console.error(`Could not send welcome DM to ${member.user.tag}:`, error);
        }
    },
};
