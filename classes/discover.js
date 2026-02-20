// Dependencies
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');

// Data
const reactablePacks = require('../data/reactablePacks');

// Schemas
const messageSchema = require('../schemas/message');
const reactableSchema = require('../schemas/reactable');

// Classes
const Pin = require("./pin");
const Reaction = require("./reaction");
const ReactionCheck = require("./reactionCheck");
const Karma = require("./karma");

class Discover {

    constructor() {
        if (Discover._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Discover._instance = this;
    }

    async loadDiscovery (interaction, member, isGlobal = false) {
		// Loading screen
		await interaction.editReply({ embeds: [new EmbedBuilder()
			.setColor("Yellow")
			.setTitle("🚀 Getting Discovery (Beta) ready...")
			.setDescription(`
> _Reto Discovery_ is an experimental feature.
> It may take a while to load your messages - hang on tight!`)] });

        // Preload emoji
        const emoji = await this.getDefaultReactableEmoji(interaction);
        
        // Get messages
        const messages = await this.getMessages(interaction, member, isGlobal);
        const toDelete = [];
        return await this.findMessage(interaction, member, messages, emoji, toDelete, isGlobal);
    }

    async findMessage (interaction, member, messages, emoji, toDelete, isGlobal = false, page = 0) {
        const messageData = messages[page];
        if (!messageData) return await this.noMessages(interaction, member, messages, emoji, toDelete, isGlobal, page);

        const channel = interaction.guild.channels.cache.get(messageData.channelId);
        if (!channel) return await this.storeMissingMessages("channel", messageData, interaction, member, messages, emoji, toDelete, isGlobal, page);

        channel.messages.fetch(messageData.messageId).then(async (message) => {
            await this.generateDiscoveryMessage(interaction, message, messageData, member, messages, emoji, toDelete, isGlobal, page);
        }).catch(async error => {
            return await this.storeMissingMessages(error, messageData, interaction, member, messages, emoji, toDelete, isGlobal, page);
        });
    }

    async generateDiscoveryMessage (interaction, message, messageData, member, messages, emoji, toDelete, isGlobal = false, page = 0) {
        
        const sortInput = interaction.options.getString("sort");
        
        console.log("🚀 Showing ".gray + interaction.user.username + " a message by ".gray + message.author.username + " (page ".gray + (page + 1) + ")".gray);
        if (sortInput == "algorithm") console.log("🪙  Score: ".gray + messageData.score + " | Karma: ".gray + messageData.karma);

        // Message
        const messageEmbed = await Pin.generateMessageEmbed(message);
        const messageKarma = await Pin.getKarmaTotalString(message, messageData);
        const messageRanking = await this.getRankingString(sortInput, page);

        const buttons = await this.generateDiscoveryButtons(message, messages, isGlobal, page, emoji);

        const reply = await interaction.editReply({ content: sortInput == "karma" ? messageRanking + "  |  " + messageKarma : messageKarma, embeds: messageEmbed, components: [buttons] });

        // Delete messages
        if (toDelete.length > 0) {
            console.log("🗑️  Deleting".gray + toDelete.length + " invalid messages...".gray);
            await messageSchema.deleteMany({ messageId: { $in: toDelete } }); // Asynchronous?
            toDelete = [];
        }

        // Collector
        await this.generateDiscoveryCollector(reply, interaction, member, message, messages, emoji, toDelete, isGlobal, page);
    }

    async generateDiscoveryButtons (message, messages, isGlobal, page, emoji) {
        const row = new ActionRowBuilder();

        row.addComponents(
            new ButtonBuilder()
                .setEmoji("⬅️")
                .setStyle("Secondary")
                .setCustomId("prev")
                .setDisabled(page <= 0)
        );

        row.addComponents(
            new ButtonBuilder()
                .setEmoji(emoji.plus.emoji)
                .setStyle("Primary")
                .setCustomId("plus")
        );

        row.addComponents(
            new ButtonBuilder()
                .setEmoji(emoji.minus.emoji)
                .setStyle("Primary")
                .setCustomId("minus")
        );


        row.addComponents(
            new ButtonBuilder()
                .setEmoji("➡️")
                .setStyle("Secondary")
                .setCustomId("next")
                // May not work on Random sort if there are any missing messages
                //.setDisabled(page >= messages.length - 1)
        );

        if (isGlobal) {
            // Currently unused
            row.addComponents(
                new ButtonBuilder()
                    .setEmoji("🚩")
                    .setStyle("Secondary")
                    .setCustomId("report")
            );
        } else {
            row.addComponents(
                new ButtonBuilder()
                    .setEmoji("🔗")
                    .setStyle("Link")
                    .setURL(message.url)
            );
        }

        return row;
    }

    async generateDiscoveryCollector(reply, interaction, member, message, messages, emoji, toDelete, isGlobal, page) {
        // TO-DO: Collectors are so general that we should probably create a generalized one?
        // Practically copied beat for beat from createChainButtonCollector (chain.js)

        // Collector
        const filter = (i) => i.user.id === interaction.user.id;
        const time = 1000 * 60 * 15; // 15 minutes
        const collector = reply.createMessageComponentCollector({ filter, max: 1, time });

        // Handle collections
        collector.on('collect', async (newInt) => {

            if (!newInt) return;
            await newInt.deferUpdate();

            switch (newInt.customId) {
                case 'prev':
                    await this.findMessage(interaction, member, messages, emoji, toDelete, isGlobal, page - 1);
                    break;
                case 'next':
                    await this.findMessage(interaction, member, messages, emoji, toDelete, isGlobal, page + 1);
                    break;
                case 'plus':
                    await this.reactToMessage(1, message, interaction, member, messages, emoji, toDelete, isGlobal, page);
                    break;
                case 'minus':
                    await this.reactToMessage(-1, message, interaction, member, messages, emoji, toDelete, isGlobal, page);
                    break;
                default:
                    interaction.editReply({ components: [] });
                    break;
            }
        });

        // On collector end, remove all buttons
        collector.on('end', (collected, reason) => {
            if (reason == "time") {
                interaction.editReply({ components: [] });
            }
        });
    }

    async getMessages(interaction, member, isGlobal, ommisions = []) {
        let match = {};
        let pipeline = [];
    
        // Variables
        const userInput = isGlobal ? interaction.options.getUser("user") : interaction.options.getUser("member");
        const sortInput = interaction.options.getString("sort");
    
        // Member/guild lookup
        !isGlobal ? (match.guildId = member.guild.id) : (match.karma = { $gt: 5 }); // Messages with >5 Karma
        if (userInput) match.userId = userInput.id;
        if (ommisions.length > 0) match.messageId = { $nin: ommisions }; // Omit specified messages
    
        // Make sure we have a channel, too
        match.channelId = { $exists: true };
    
        // Add $match to the pipeline
        pipeline.push({ $match: match });
    
        // Sorting
        switch (sortInput) {
            case "random":
                pipeline.push({ $sample: { size: 100 } }); // Arbitrary number
                break;
            case "karma":
                pipeline.push({ $sort: { karma: -1 } }); // Descending (highest to lowest)
                break;
            case "reverse-chronological":
                pipeline.push({ $sort: { createdAt: -1 } }); // Descending (highest to lowest)
                break;
            case "chronological":
                pipeline.push({ $sort: { createdAt: 1 } }); // Ascending (lowest to highest)
                break;
            case "algorithm":
                pipeline = pipeline.concat(await this.getForYouMessages()); // "For You" sorting
                break;
            default:
                pipeline.push({ $sample: { size: 100 } }); // Random
                break;
        }
    
        // TO-DO: Censor (SFW/NSFW), Filter (Media, text, etc.)
    
        return await messageSchema.aggregate(pipeline).exec();
    }
    
    async getForYouMessages() {

        // We want to test out something more similar to HackerNews' algorithm, which looks like this:
        // rankingScore = pow(upvotes, 0.8) / pow(ageHours + 2, 1.8)
    
        const currentTime = Date.now(); // Current time in milliseconds (not seconds)
        const karmaWeight = 0.8;
        const ageWeight = 1.8;
    
        return [
            {
                // Calculate the age of the message in hours
                $addFields: {
                    ageHours: {
                        $divide: [
                            { $subtract: [currentTime, { $toLong: "$createdAt" }] },
                            3600 * 1000  // Convert milliseconds to hours
                        ]
                    }
                }
            },
            {
                // Calculate the ranking score using HackerNews' algorithm:
                // rankingScore = (max(karma, 0) ^ 0.8) / ((ageHours + 2) ^ 1.8)
                $addFields: {
                    rankingScore: {
                        $divide: [
                            { $pow: [ { $max: ["$karma", 0] }, karmaWeight ] },
                            { $pow: [ { $add: ["$ageHours", 2] }, ageWeight ] }
                        ]
                    }
                }
            },
            {
                // Sort messages by the calculated ranking score in descending order
                $sort: { rankingScore: -1 }
            }
        ];
    }
    

    async getDefaultReactableEmoji(interaction) {
        // Estimate the default reactable emoji by finding reactables with the following criteria
        const reactables = await reactableSchema.find({
            guildId: interaction.guild.id,
            globalKarma: true,
            karmaAwarded: { $in: [1, -1] },
            lockedBehindRoles: { $size: 0 },
            reactionThreshold: { $in: [0, 1] }
        }).exec();

        // Find the best Plus candidate: prefers name "plus", must not send to a channel
        const plusReactable =
            reactables.find(r => r.name === "plus" && !r.sendsToChannel) ||
            reactables.find(r => r.karmaAwarded === 1 && !r.sendsToChannel);

        // Find the best Minus candidate: prefers name "minus", must not send to a channel
        const minusReactable =
            reactables.find(r => r.name === "minus" && !r.sendsToChannel) ||
            reactables.find(r => r.karmaAwarded === -1 && !r.sendsToChannel);
        
        // TO-DO: Find the Pin reactable.
        // Not necessary for Discover, but may be re-used in future features.

        return {
            plus: {
                emoji: plusReactable?.emojiIds[0] || reactablePacks.reto.emoji.plus,
                reactable: plusReactable || null
            },
            minus: {
                emoji: minusReactable?.emojiIds[0] || reactablePacks.reto.emoji.minus,
                reactable: minusReactable || null
            }
        };
    }

    async reactToMessage(amount, message, interaction, member, messages, emoji, toDelete, isGlobal, page) {
        let isPositive = true;

        // Reuse the reactable found at load time instead of querying again
        const reactable = amount === 1 ? emoji.plus.reactable : emoji.minus.reactable;

        const previouslyReacted = await ReactionCheck.checkIfPreviouslyReacted(
            message,
            interaction.user,
            reactable || undefined,
            reactable ? false : true
        );

        if (previouslyReacted) isPositive = false;

        await Reaction.sendReactionToConsole(
            message, // No message.author
            interaction.user,
            reactable ? reactable : false,
            amount,
            isPositive,
            true
        );

        // Store reaction, award Karma
        const karmaToAward = isPositive
            ? amount
            : amount * -1;
    
        const savedReaction = await Reaction.saveOrDeleteReaction(message, interaction.user, reactable, isPositive);
        if (!savedReaction) return;

        // If no reactable was found, still award global karma, just skip local tracking
        await Karma.awardKarmaToUser(
            karmaToAward,
            message.author,
            message,
            reactable ? isGlobal : true  // Force skipLocalUpdates if there's no reactable
        );

        // Continue to next message
        const updatedIndex = messages.findIndex(m => m.messageId === message.id);
        messages[updatedIndex].karma = messages[updatedIndex].karma + karmaToAward;

        const skipReact = interaction.options.getBoolean("skipReact") || false;
        await this.findMessage(interaction, member, messages, emoji, toDelete, isGlobal, skipReact ? page + 1 : page);
    }

    async storeMissingMessages (error, messageData, interaction, member, messages, emoji, toDelete, isGlobal, page) {
        const errorMessage = error == "channel" ? "channel" : error.message;
        
        if (errorMessage == "channel" || errorMessage == "Unknown Message" || errorMessage == "Missing Access") {
            // Delete these messages once we find a valid one
            const newToDelete = [...toDelete, messageData.messageId];
            // Until then, remove it from the valid messages
            messages.splice(messages.findIndex(message => message.messageId === messageData.messageId), 1);
            // Show warning message if we're taking too long
            if (newToDelete.length == 10) {
                await interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("🚀 Getting Discovery (Beta) ready...")
                    .setDescription(`
> _Reto Discovery_ is an experimental feature.
> Looks like we're taking longer than usual to find you a message...!
> We're deleting some invalid messages to speed things up next time.`)] });
            }

            await this.findMessage(interaction, member, messages, emoji, newToDelete, isGlobal, page);
        } else {
            console.log(error);
        }
    }

    async noMessages (interaction, member, messages, emoji, toDelete, isGlobal, page) {
        const ommisions = messages.map(messageData => messageData.messageId);
        const newMessages = await this.getMessages(interaction, member, isGlobal, ommisions);

        let userData;
        const userInput = isGlobal ?  interaction.options.getUser("user") : interaction.options.getUser("member");
        if (userInput) userData = await interaction.guild.members.fetch(userInput.id);

        if (newMessages.length == 0) {
            // TO-DO: Do another
            // If we ran out of messages
            await interaction.editReply({ content: "", components: [],embeds: [new EmbedBuilder()
                .setColor("Red")
                .setTitle("🚀 We couldn't find a message!")
                .setDescription(`
Either ` + (userInput ? userData.guild.nickname || userData.user.globalName || userData.user.username + ` is new to Reto` : `your server is very new to Reto _(in which case, get reacting!)_`) + `, or you've seen all stored messages on your Server.`)] });
        } else {
            messages.push(...newMessages);
            await this.findMessage(interaction, member, messages, emoji, toDelete, isGlobal, page + 1);
        }
    }

    async getRankingString (sortInput, page) {
        if (sortInput != "karma") return;
        // If we're sorting By Karma, then page = rank
        // If we ever integrate this with any other kind of view this would not work properly
        let badge;
        
        switch (page + 1) {
            case 3:
                badge = "🥉";
                break;
            case 2:
                badge = "🥈";
                break;
            case 1:
                badge = "🥇";
                break;
            default:
                badge = "🏅";
                break;
        }

        return badge + " **" + (page + 1) + "**";
    }
}

module.exports = new Discover();