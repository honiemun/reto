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

// Helper: throttle sends to avoid Discord rate limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        
        const embeds = await this.generateNewsEmbed(interaction, message, {}, true, interaction.options.getBoolean("override"));
    
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

    async generateNewsEmbed (interaction, message, article = {}, footer = true, override = false) {
        // Refactored version of Pin's generateMessageEmbed,
        // with some modifications for displaying news (and without Chain Messages).
        
        let messageEmbed = {
            url: article.url || interaction.options ? interaction.options.getString("url") : "https://retobot.com" || "https://retobot.com",
            timestamp: new Date(article.createdAt || message.createdTimestamp).toISOString(),
            fields: [],
            color: 0x202225,
            author: {
                name: "The Reto Development Team",
                icon_url: "https://retobot.com/favicon.png" // TO-DO: We shouldn't depend on retobot.com!
            },
            footer: {
                text:
                    override ? "You're seeing this because it's a critical Reto announcement." : 
                    footer ? "You're seeing this because the server is subscribed to the Reto Newsletter." :
                    "Reto Newsletter"
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
        let failedCount = 0;

        const guilds = await this.findBroadcastChannels(client, interaction.options.getBoolean("override"));

        // Get the news document first so we can check which guilds already received this broadcast
        // This makes the broadcast safe to re-run if it crashes partway through
        const existingNews = await newsSchema.findOne({ messageId: message.id });
        const alreadySent = existingNews
            ? await broadcastedNewsSchema.find({ newsId: existingNews._id }).distinct("guildId")
            : [];
      
        for (const guildId of Object.keys(guilds)) { // for...of loop for async iteration
            // Skip guilds that already received this broadcast, to prevent duplicates on retry
            if (alreadySent.includes(guildId)) {
                console.log("⏭️  Skipping guild (already received): ".gray + guildId);
                continue;
            }

            let channelId = guilds[guildId];
            let broadcastedMessage;

            // Wrap each send in its own try/catch so a single failure can't abort the entire loop
            try {
                broadcastedMessage = await this.sendNewsToGuild(guildId, channelId, embeds, urlRow, client);
            } catch (e) {
                console.log("❌ Unexpected error sending to guild ".red + guildId + ": " + e.message);
                failedCount++;
            }
      
            if (broadcastedMessage) {
                broadcastedNews.push({
                    messageId: broadcastedMessage.id,
                    channelId: channelId,
                    guildId: guildId
                });

                // Save each successful broadcast immediately,
                // so progress is preserved if the process crashes mid-broadcast
                await this.updateNewsDocument(interaction, message, [{
                    messageId: broadcastedMessage.id,
                    channelId,
                    guildId
                }]);
            } else {
                failedCount++;
            }

            // Throttle sends to avoid hitting Discord's rate limits
            await sleep(1000);
        }

        return await interaction.editReply({
            content: `Your news article has been broadcast to **${broadcastedNews.length}** servers! *(${failedCount} failed — check logs)*`,
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
                        // Explicitly exclude null values, not just check existence
                        "sendsToChannel": { $exists: true, $ne: null }
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
            
            // Reactable with Sends to Channel action
            if (guild.reactables.length > 0 && client.channels.cache.has(guild.reactables[0].sendsToChannel)) {
                broadcastChannels[guild.guildId] = guild.reactables[0].sendsToChannel;
                continue;
            }

            // Pin Threshold channel
            if (guild.pinthresholds.length > 0 && client.channels.cache.has(guild.pinthresholds[0].channelId)) {
                broadcastChannels[guild.guildId] = guild.pinthresholds[0].channelId;
                continue;
            }

            const guildObject = client.guilds.cache.get(guild.guildId);
            if (!guildObject) continue;

            let firstValidChannel;
            let foundNamedChannel = false;

            for (const channel of guildObject.channels.cache.values()) {
                if (channel.type !== 0 ||
                    !channel.permissionsFor(guildObject.members.me)?.has(PermissionsBitField.Flags.SendMessages)) continue;
                
                if (!firstValidChannel) firstValidChannel = channel;
                
                // Admin/Mod/Bots channel
                if (channel.name.toLowerCase().includes("mod") || channel.name.toLowerCase().includes("admin") || channel.name.toLowerCase().includes("bot")) {
                    broadcastChannels[guild.guildId] = channel.id;
                    foundNamedChannel = true;
                    break;
                }
            }

            // First accessible channel (only if we didn't already find a named one)
            if (!foundNamedChannel) {
                if (firstValidChannel) {
                    broadcastChannels[guild.guildId] = firstValidChannel.id;
                    console.log("Found accessible channel for guild ".gray + guild.guildId + ": ".gray + firstValidChannel.id);
                } else {
                    console.log("❌ No accessible channel found for guild ".red + guild.guildId);
                }
            }
        }

        console.log(broadcastChannels);
        return broadcastChannels;
    }

    async sendNewsToGuild (guildId, channelId, embeds, urlRow, client) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.log("❌ Couldn't send news to guild! ".red + "(ID: ".gray + guildId + ")".gray);
            return;
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            console.log("❌ Couldn't send news to guild! ".red + "(".gray + guild.name + " — channel not found)".gray);
            return;
        }

        const canSend = channel.permissionsFor(guild.members.me)?.has(PermissionsBitField.Flags.SendMessages);
        if (!canSend) {
            console.log("❌ Missing send permissions in ".red + "#" + channel.name + " (".gray + guild.name + ")".gray);
            return;
        }

        try {
            console.log("🗞️  Sending news article to ".gray + "#".green + channel.name.green + " (".gray + guild.name.green + ")".gray);
            return await channel.send({ embeds: embeds, components: urlRow ? [urlRow] : [] });
        } catch (e) {
            console.log("❌ Couldn't send news to guild! ".red + "(".gray + guild.name + ")".gray + "\n" + e);
        }
    }

    async showScrollableNews(interaction, client) {
        // This helper function fetches a batch of 5 news articles from the database,
        // starting at the given skip amount.
        const fetchBatch = async (skip, limit = 5) => {
          const articles = await newsSchema
            .find({ published: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
      
          let batchContent = [];
          let cachedGuilds = new Map();
          let cachedChannels = new Map();
      
          for (const article of articles) {
            try {
              // Retrieve guild from cache or fetch it
              let guild;
              if (cachedGuilds.has(article.guildId)) {
                guild = cachedGuilds.get(article.guildId);
              } else {
                guild = client.guilds.cache.get(article.guildId);
                if (!guild) throw new Error("Guild not found");
                cachedGuilds.set(article.guildId, guild);
              }
      
              // Retrieve channel from cache or fetch it
              let channel;
              if (cachedChannels.has(article.channelId)) {
                channel = cachedChannels.get(article.channelId);
              } else {
                channel = guild.channels.cache.get(article.channelId);
                if (!channel) throw new Error("Channel not found");
                cachedChannels.set(article.channelId, channel);
              }
      
              const message = await channel.messages.fetch(article.messageId);
              const newsEmbed = await this.generateNewsEmbed(interaction, message, article, false);
              const formatted = await this.formatEmbedsForScroll(newsEmbed, article);
              batchContent.push(formatted);
            } catch (e) {
              console.log("❌ Couldn't find news! (ID: " + article.messageId + ")\n" + e.message);
              // Optionally mark for deletion or ignore the article
            }
          }
          return batchContent;
        };
      
        // Initially load the first batch.
        let content = await fetchBatch(0, 5);
      
        if (content.length === 0) {
          const error = await Embed.createErrorEmbed("There is no news.");
          return await interaction.followUp({ embeds: [error] });
        }
      
        // Define a callback to fetch additional pages.
        const fetchMoreCallback = async (currentCount) => {
          // currentCount is the number of items already loaded.
          const nextBatch = await fetchBatch(currentCount, 5);
          return nextBatch; // could be empty if no more news
        };
      
        // Pass the fetchMoreCallback into our scroll function.
        return await Scroll.createScrollableList(interaction, content, interaction.user.id, fetchMoreCallback);
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

    async getUrlRow(url, urlText) {
        if (!url) return;

        const urlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(urlText || "Learn more")
                    .setStyle(ButtonStyle.Link)
                    .setURL(url)
            );
        
        return urlRow;
    }

    async findOfficialNewsArticle (message) {
        // Just to optimize a little bit, so we don't make a database call on any edit,
        // we're going to assume that the only servers that can create, update or delete
        // news are development servers, and that only bot owners can edit them.
        
        const guilds = process.env.TEST_SERVERS.split(",");
        const owners = process.env.BOT_OWNERS.split(",");
        if (!guilds.includes(message.guildId) || !message.author || !owners.includes(message.author.id)) return false;

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