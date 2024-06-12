// Dependencies
const { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');

// Data
const brandingColors = require('../../data/brandingColors');

module.exports = async (guild) => {

    console.log("✨ Reto".bold + " just joined the ".gray + guild.name.yellow + " server!".gray)

    let messageSent = false;

    guild.channels.cache.forEach(async (channel) => {

        if ( channel.type === 0 &&
            channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages) &&
            !messageSent ) {
            
            const file = new AttachmentBuilder('./assets/logos/pfp.png');

            const embed = new EmbedBuilder()
            .setTitle("Welcome to Reto!")
            // TO-DO: Change after Open Beta
            .setDescription("Thank you for inviting Retool to your server! The bot is currently in Beta - keep in mind that some features might be missing or broken. If anything goes awry, check out the `/support` server!")
            .setColor(brandingColors.brightPink)
            .setThumbnail('attachment://pfp.png')
            .addFields(
                {
                    name: '✨ Before we get started...',
                    value: "A **Server Moderator** needs to configure the bot! Use `/setup` to get everything ready - then afterwards, anyone can use `/guide` to find out what they can do with Reto.",
                    inline: false
                },
            );

            messageSent = true;
            return await channel.send({ embeds: [embed], files: [file] });

        }
    })

};