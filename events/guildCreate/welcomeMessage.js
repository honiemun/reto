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
            channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ViewChannel) &&
            !messageSent ) {
            
            const file = new AttachmentBuilder('./assets/logos/pfp.png');

            const embed = new EmbedBuilder()
            .setTitle("Welcome to Reto!")
            // TO-DO: Change after full release
            .setDescription("Thank you for inviting Reto to your server! Reactions, Karma, Starboard and more tools to make your community a fun place to be await. \n\nThe bot is currently in Open Beta - keep in mind that some features might be missing or broken. If anything goes awry, check out the `/support` server!")
            .setColor(brandingColors.brightPink)
            .setThumbnail('attachment://pfp.png')
            .addFields(
                {
                    name: '✨ Before we get started...',
                    value: "A **Server Moderator** needs to configure the bot! Use `/setup` to get everything ready - then afterwards, anyone can use `/guide` to find out what they can do with Reto on this server.",
                    inline: false
                },
            );

            messageSent = true;
            
            try {
                return await channel.send({ embeds: [embed], files: [file] });
                console.log("✅ Welcome message sent in #".gray + channel.name.yellow + " for the ".gray + guild.name.yellow + " server!".gray);
            } catch (e) {
                console.log("❌ Couldn't send welcome message!".red + (" | " + e.message).gray);
                messageSent = false; // Try the next channel
            }

        }
    })

};