// Dependencies
const { ButtonStyle, ActionRowBuilder, ButtonBuilder, PermissionsBitField } = require("discord.js");

// Schemas
const newsSchema = require('../schemas/news');
const broadcastedNewsSchema = require('../schemas/broadcastedNews');

const guildSchema = require('../schemas/guild');
const reactableSchema = require('../schemas/reactable');

// Classes
const Embed = require("../classes/embed");
const Pin = require("../classes/pin");
const Scroll = require("../classes/scroll");

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
            let error;

            // I have more error catching here than in customer facing parts. Honestly, we could port this to the Error class.
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

    async generateNewsEmbed (interaction, message, article = {}, footer = true) {
        // Refactored version of Pin's generateMessageEmbed,
        // with some modifications for displaying news (and without Chain Messages).
        
        let messageEmbed = {
            url: article.url || interaction.options ? interaction.options.getString("url") : "https://retobot.com" || "https://retobot.com",
            timestamp: new Date(message.createdTimestamp).toISOString(),
            fields: [],
            color: 0x202225,
            author: {
                name: "The Reto Development Team",
                icon_url: "https://retobot.com/favicon.png" // TO-DO: We shouldn't depend on retobot.com!
            },
            footer: {
                text: footer ? "You're seeing this because the server is subscribed to the Reto Newsletter." : "Reto Newsletter"
            }
        };

        // Title
        messageEmbed.title = article.title || interaction.options.getString("title");

        // Content
        messageEmbed.description = message.content;
        
        // Images
        // One image
        messageEmbed.image  = await Pin.setEmbedSingleImage(message);

        // Multi-image
        let embedArray = await Pin.setEmbedImages(message, messageEmbed.url);
        embedArray.unshift(messageEmbed);

        return embedArray;
    }

    async publishNews(interaction, message) {
        const news = await this.updateNewsDocument(interaction, message);

        return await interaction.editReply({
            content: `Your news article, **${news.title}**, has been published to \`/newsletter\`!`,
            embeds: [],
            components: []
        });
    }

    async updateNewsDocument(interaction, message, broadcastedNews = []) {
        /*  Published news are stored into the database,
            and are accessible through /news.
            
            Broadcasting also publishes an article, though
            you may opt to not broadcast if it's a minor update. */
        
        const news = await newsSchema.findOneAndUpdate(
            { messageId: message.id },
            { $set : { 
                published: true,

                channelId: interaction.channel.id,
                guildId: interaction.guild.id,

                title: interaction.options.getString("title"),
                url: interaction.options.getString("url"),
                urlText: interaction.options.getString("url-title"),
            }},
            { upsert: true, new: true }
        ).exec();

        if (broadcastedNews.length > 0) {
            const bulkOps = broadcastedNews.map(broadcast => ({
                updateOne: {
                  filter: { newsId: news._id, guildId: broadcast.guildId },
                  update: { $setOnInsert: { 
                    newsId: news._id,
                    messageId: broadcast.messageId,
                    channelId: broadcast.channelId,
                    guildId: broadcast.guildId
                   } },
                  upsert: true
                }
              }));
          
              const broadcasted = await broadcastedNewsSchema.bulkWrite(bulkOps);
        }
        
        return news;
    }

    async broadcastNews (interaction, message, embeds, urlRow, client) {
        let broadcastedNews = [];
        const guilds = await this.findBroadcastChannels(client, interaction.options.getBoolean("override"));
      
        for (const guildId of Object.keys(guilds)) { // for...of loop for async iteration
          let channelId = guilds[guildId];
          let broadcastedMessage = await this.sendNewsToGuild(guildId, channelId, embeds, urlRow, client);
      
          if (broadcastedMessage) {
            broadcastedNews.push({
              messageId: broadcastedMessage.id,
              channelId: channelId,
              guildId: guildId
            });
          }
        }

        const news = await this.updateNewsDocument(interaction, message, broadcastedNews);
        
        return await interaction.editReply({
            content: `Your news article, **${news.title}**, has been broadcast to ${broadcastedNews.length} servers!`,
            embeds: [],
            components: []
        });
    }

    async findBroadcastChannels (client, override = false) {
        /*
        In order of priority:
        - Reactable with sendsToChannel (most amount of Karma wins)
        - Pin Threshold (most amount of Karma wins)
        - Server channel with "mod", "admin" or "bot" in its name
        - Earliest channel which the bot has permission to send messages on */
        let broadcastChannels = {};

        const reactableLookup = {
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
        }

        const thresholdLookup = {
            $lookup: {
                from: "pinthresholds",
                pipeline: [{
                    $sort: { "karma": -1 }
                }],
                localField: "guildId",
                foreignField: "guildId",
                as: "pinthresholds"
            }
        };

        const guildLookup = override ? [reactableLookup, thresholdLookup] : [{$match: { subscribedToNewsletter: true }}, reactableLookup, thresholdLookup];
        const guilds = await guildSchema.aggregate(guildLookup).exec();

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

        console.log(broadcastChannels);
        return broadcastChannels;
    }

    async sendNewsToGuild (guildId, channelId, embeds, urlRow, client) {
        const guild = await client.guilds.cache.get(guildId);
        if (!guild) return console.log("❌ Couldn't send news to guild! ".red + "(ID: ".gray + guildId + ")".gray);

        const channel = await guild.channels.cache.get(channelId);
        if (!channel) return console.log("❌ Couldn't send news to guild! ".red + "(".gray + guild.name + ")".gray);

        try {
            console.log("🗞️  Sending news article to ".gray + "#".green + channel.name.green + " (".gray + guild.name.green + ")".gray);
            return await channel.send({ embeds: embeds, components: urlRow ? [urlRow] : [] });
        } catch (e) {
            console.log("❌ Couldn't send news to guild! ".red + "(ID: ".gray + guild.gray + ")".gray + "\n" + e)
        }
    }

    async showScrollableNews (interaction, client) {
        let deleteNews = [];

        const news = await newsSchema.find({ published: true }).sort({ createdAt: -1 }).exec();
        if (!news) {
            const error = await Embed.createErrorEmbed("[There is no news.](https://pbs.twimg.com/media/DpJ513bXUAA0tBJ.jpg:large)"); // TODO: Send image locally
            return await interaction.followUp({ embeds: [error] });
        }

        const content = [];

        for (const article of news) {
            // NOTE: We should do this at runtime, when clicking a button.
            try {
                // TO-DO: Cache the guild and channel so we don't have to do this for every message
                const guild = await client.guilds.cache.get(article.guildId);
                const channel = await guild.channels.cache.get(article.channelId);
                const message = await channel.messages.fetch(article.messageId);

                content.push(await this.formatEmbedsForScroll(await this.generateNewsEmbed(interaction, message, article, false), article));
            } catch (e) {
                console.log("❌ Couldn't find news! ".red + "(ID: ".gray + article.messageId.gray + ")".gray + "\n" + e.message);
                deleteNews.push(article.messageId);
            }
        }

        // Delete news that can't be fetched
        if (deleteNews.length > 0) await newsSchema.deleteMany({ messageId: { $in: deleteNews } });

        // Scroll through news
        return await Scroll.createScrollableList(interaction, content, interaction.user.id);
    }

    async formatEmbedsForScroll(embeds, article) {
        return {
            embeds: embeds,
            components: article.url ? [
                { type: 'prev' },
                {
                    label: article.urlText || "Learn more",
                    style: ButtonStyle.Link,
                    url: article.url,
                    customId: "url"
                },
                { type: 'post' }
            ] : null,
            message: "test"
        }
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

    async findOfficialNewsArticle (message) {
        // Just to optimize a little bit, so we don't make a database call on any edit,
        // we're going to assume that the only servers that can create, update or delete
        // news are development servers, and that only bot owners can edit them.
        
        const guilds = process.env.TEST_SERVERS.split(",");
        const owners = process.env.BOT_OWNERS.split(",");
        if (!guilds.includes(message.guildId) || !owners.includes(message.author.id)) return false;

        const newsToUpdate = await newsSchema.findOne({ messageId: message.id });
        if (!newsToUpdate) return false;

        return newsToUpdate;
    }

    // Could be abstracted into a helper "find message by IDs" function
    async fetchExistingNews (interaction, broadcast) {
        try {
            const guild = await interaction.client.guilds.cache.get(broadcast.guildId);
            const channel = await guild.channels.cache.get(broadcast.channelId);
            const message = await channel.messages.fetch(broadcast.messageId);

            if (message) return message;
            return false;
        } catch (e) {
            switch (e.code) {
                case 10008:
                    console.log("❌ News message was already deleted. ".gray + "(ID: ".gray + broadcast.messageId.gray + ")".gray);
                    return false;
                default:
                    console.log("❌ Couldn't update news! ".red + "(ID: ".gray + broadcast.messageId.gray + ")".gray + "\n" + e.code + ": " + e.message);
                    return false;
            }
        }
    }

    async updateNews (interaction, newMessage) {
        const newsToUpdate = await this.findOfficialNewsArticle(newMessage);
        if (!newsToUpdate) return false;
        
        const broadcasts = await broadcastedNewsSchema.find({ newsId: newsToUpdate._id });

        for (const broadcast of broadcasts) {
            await this.fetchExistingNews(interaction, broadcast).then(async (message) => {
                if (!message) return;
                console.log("🗞️  Updating news article on the".gray + message.guild.name + " guild...".gray);
                await message.edit({ embeds: await this.generateNewsEmbed(interaction, newMessage, newsToUpdate, true) });
            });
        }
    }

    async deleteNews (interaction, message) {
        const newsToDelete = await this.findOfficialNewsArticle(message);
        if (!newsToDelete) return false;
        
        const broadcasts = await broadcastedNewsSchema.find({ newsId: newsToDelete._id });
        let broadcastAmount = 0;

        for (const broadcast of broadcasts) {
            await this.fetchExistingNews(interaction, broadcast).then(async (message) => {
                if (!message) return;
                console.log("🗞️  Deleting news article on the".gray + message.guild.name + " guild...".gray);
                await message.delete();
                broadcastAmount++;
            });
        }

        if (broadcastAmount > 0) {
            await newsSchema.deleteOne({ _id: newsToDelete._id });
            await broadcastedNewsSchema.deleteMany({ newsId: newsToDelete._id });
        }
    }
}

module.exports = new News();