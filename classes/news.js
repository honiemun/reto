// Dependencies
const { ButtonStyle, ActionRowBuilder, ButtonBuilder, PermissionsBitField } = require("discord.js");

// Schemas
const newsSchema = require('../schemas/news');
const guildSchema = require('../schemas/guild');
const reactableSchema = require('../schemas/reactable');

// Classes
const Embed = require("../classes/embed");
const Pin = require("../classes/pin");

class News {
    
    constructor() {
        if (News._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        News._instance = this;
    }

    async broadcast(interaction, client) {
        /*
        LIMITATIONS OF THE NEWS SYSTEM:
        - IMPORTANT: Optional overriding of the Newsletter Subscribed check for major announcements (Retool Open Beta, Release)
        - No way to currently edit a news article and have that edit reflected throughout servers.
        - News articles depend on a message ID, much like Pinning. If the message is deleted, the news article is inaccessible.
        - Depending on how Discord does images outside of servers, images on a News broadcast may not be available.
        - No validation on the URL field. Not strictly necessary, with it being a development tool.
        */
        const messageId = interaction.options.getString("message");
        let message;

        try {
            message = await interaction.channel.messages.fetch(messageId);
        } catch (e) {
            // I have more error catching here than in customer facing parts. Honestly, we could port this to the Error class.
            let error;

            switch (e.code) {
                case 10008:
                    error = await Embed.createErrorEmbed("The message you're trying to turn into a news article doesn't exist, or isn't available on this channel/server.");
                    break;
                case 50035:
                    error = await Embed.createErrorEmbed("That isn't a valid message ID!");
                    break;
                default:
                    error = await Embed.createErrorEmbed("There was a problem when trying to turn your message into a news article: `" + e.message + "`");
                    break;
            }
            
            return interaction.followUp({ embeds: [error] });
        }

        await this.generateNewsPreview(interaction, message, client)
        
    }

    async generateNewsPreview (interaction, message, client) {
        const url     = interaction.options.getString("url");
        const urlText = interaction.options.getString("url-title");

        let urlRow = await this.getUrlRow(url, urlText);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Broadcast and publish')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('broadcast'),
                new ButtonBuilder()
                    .setLabel('Only publish')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('publish'),
            );
        
        const embeds = await this.generateNewsEmbed(interaction, message);
    
        const preview = await interaction.editReply({
            content: `This is your news post. What would you like to do?`,
            embeds: embeds,
            components: urlRow ? [urlRow, row] : [row],
            ephemeral: true
        });

        const filter = (i) => i.user.id === interaction.user.id;
		const time = 1000 * 60 * 5; // 5 minutes
        const collector = preview.createMessageComponentCollector({ filter, max: 1, time });

		collector.on('collect', async i => {
            switch (i.customId) {
                case 'broadcast':
                    return this.broadcastNews(interaction, message, embeds, urlRow, client);
                case 'publish':
                    await this.publishNews(interaction, message);

            }
		});
    }

    async generateNewsEmbed (interaction, message) {
        // Refactored version of Pin's generateMessageEmbed,
        // with some modifications for displaying news (and without Chain Messages).
        
        let messageEmbed = {
            url: interaction.options.getString("url") || "https://retobot.com",
            timestamp: new Date(message.createdTimestamp).toISOString(),
            fields: [],
            color: 0x202225,
            author: {
                name: "The Reto Development Team",
                icon_url: "https://retobot.com/favicon.png" // TO-DO: We shouldn't depend on retobot.com!
            },
            footer: {
                text: "You're seeing this message because this server is subscribed to the Reto Newsletter."
            }
        };

        // Title
        messageEmbed.title = interaction.options.getString("title");

        // Content
        messageEmbed.description = message.content;
        
        // Images
        // (offloading this logic to Pinning)
        let embedArray = await Pin.setEmbedImages(message, messageEmbed.url);
        embedArray.unshift(messageEmbed)

        return embedArray;
    }

    async publishNews(interaction, message) {
        const news = await this.updateNews(interaction, message);

        return await interaction.editReply({
            content: `Your news article, **${news.title}**, has been published to \`/news\`!\nYou can edit it later using the same \`${message.id}\` message ID.`,
            embeds: [],
            components: []
        });
    }

    async updateNews(interaction, message, broadcastedIds = []) {
        /*  Published news are stored into the database,
            and are accessible through /news.
            
            Broadcasting also publishes an article, though
            you may opt to not broadcast if it's a minor update. */
        
        const news = await newsSchema.findOneAndUpdate(
            { messageId: message.id },
            { $set : { 
                published: true,

                title: interaction.options.getString("title"),
                url: interaction.options.getString("url"),
                urlText: interaction.options.getString("url-title"),
                
                broadcastedIds: broadcastedIds
            }},
            { upsert: true }
        ).exec();
        
        return news;
    }

    async broadcastNews (interaction, message, embeds, urlRow, client) {
        let broadcastedIds = [];
        const guilds = await this.findBroadcastChannels(client);

        Object.keys(guilds).forEach(async (guildId) => {
            let channelId = guilds[guildId];

            let broadcastedMessage = await this.sendNewsToGuild(guildId, channelId, embeds, urlRow, client);
            if (broadcastedMessage) broadcastedIds.push(broadcastedMessage.id);
        });

        const news = await this.updateNews(interaction, message, broadcastedIds);

        return await interaction.editReply({
            // 
            content: `Your news article, **${news.title}**, has been broadcast to ${broadcastedIds.length} servers!`,
            embeds: [],
            components: []
        });
    }

    async findBroadcastChannels (client) {
        /*
        In order of priority:
        - Reactable with sendsToChannel (most amount of Karma wins)
        - Pin Threshold (most amount of Karma wins)
        - Server channel with "mod", "admin" or "bot" in its name
        - Earliest channel which the bot has permission to send messages on */
        let broadcastChannels = {};

        const guilds = await guildSchema.aggregate([
            {
                $match: { subscribedToNewsletter: true }
            },
            {
                $lookup: {
                    from: "reactables",
                    pipeline: [{
                        $match: {
                            "sendsToChannel": { $exists: true }
                        }
                    }, {
                        $sort: { "karmaAwarded": -1 }
                    }],
                    localField: "guildId",
                    foreignField: "guildId",
                    as: "reactables"
                }
            },
            {
                $lookup: {
                    from: "pinthresholds",
                    pipeline: [{
                        $sort: { "karma": -1 }
                    }],
                    localField: "guildId",
                    foreignField: "guildId",
                    as: "pinthresholds"
                }
            }
        ]).exec();

        for (const guild of guilds) {
            
            // Reactable-sent channel
            if (guild.reactables.length > 0) {
                broadcastChannels[guild.guildId] = guild.reactables[0].sendsToChannel;
                continue;
            }

            // Pin Threshold channel
            if (guild.pinthresholds.length > 0) {
                broadcastChannels[guild.guildId] = guild.pinthresholds[0].channelId;
                continue;
            }

            const guildObject = client.guilds.cache.get(guild.guildId);
            if (!guildObject) continue;
            
            // TO-DO: CHECK IF THIS WORKS! LIKE, AT ALL!

            let firstValidChannel;

            guildObject.channels.cache.forEach(async (channel) => {
                if (!channel.type === 0 &&
                    channel.permissionsFor(guildObject.members.me).has(PermissionFlagsBits.SendMessages)) return;
                
                if (!firstValidChannel) firstValidChannel = channel;
                
                // Admin/Mod/Bots channel
                if (channel.name.toLowerCase().includes("mod") || channel.name.toLowerCase().includes("admin") || channel.name.toLowerCase().includes("bot")) {
                    broadcastChannels[guild.guildId] = channel.id;
                    return;
                }
            })

            // First accessible channel
            if (firstValidChannel) broadcastChannels[guild.guildId] = firstValidChannel.id;
        }

        return broadcastChannels;
    }

    async sendNewsToGuild (guildId, channelId, embeds, urlRow, client) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return console.log("❌ Couldn't send news to guild! ".red + "(ID: ".gray + guildId + ")".gray);

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return console.log("❌ Couldn't send news to guild! ".red + "(".gray + guild.name + ")".gray);

        try {
            console.log("🗞️  Sending news article to ".gray + "#".green + channel.name.green + " (".gray + guild.name.green + ")".gray);
            return await channel.send({ embeds: embeds, components: urlRow ? [urlRow] : [] });
        } catch (e) {
            console.log("❌ Couldn't send news to guild! ".red + "(ID: ".gray + guild.gray + ")".gray + "\n" + e)
        }
    }

    async showScrollableNews (interaction, member) {
    }

    async getUrlRow (url, urlText) {
        if (!url) return;

        urlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(urlText || "Learn more")
                    .setStyle(ButtonStyle.Link)
                    .setURL(url)
            )
    }
}

module.exports = new News();