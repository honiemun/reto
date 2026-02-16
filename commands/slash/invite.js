const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { CommandType } = require("wokcommands");
const branding = require("../../data/brandingColors");

module.exports = {
    category: 'About',
    description: 'Get an invite link for the bot.',

    type: CommandType.SLASH,
    guildOnly: false,

    callback: ({ interaction }) => {
        const clientId = process.env.CLIENT_ID || '';
        const permissions = process.env.PERMISSIONS || '';

        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;

        const inviteButton = new ButtonBuilder()
            .setLabel('Invite me')
            .setStyle(ButtonStyle.Link)
            .setURL(inviteUrl);

        const row = new ActionRowBuilder().addComponents(inviteButton);

        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(branding.brightPink)
                    .setTitle('Hello, Reto!')
                    .setDescription('Click the button below to invite Reto to your server.')
            ],
            components: [row]
        };
    },
};
