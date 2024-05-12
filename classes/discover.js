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

    // TO-DO for later
    // - Make another query if we run out of messages (or make random selection infinite)
    // - Add Post Leaderboard rankings (by Karma)
    // - Add "Skip after Reaction" optional function
    // - Modify No Messages to show "Either (USER) hasn't used Reto" if filter is by Member

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
        if (!messageData) return await this.noMessages(interaction);

        const channel = interaction.guild.channels.cache.get(messageData.channelId);
        if (!channel) return await this.storeMissingMessages("channel", messageData, interaction, member, messages, emoji, toDelete, isGlobal, page);

        channel.messages.fetch(messageData.messageId).then(async (message) => {
            await this.generateDiscoveryMessage(interaction, message, messageData, member, messages, emoji, toDelete, isGlobal, page);
        }).catch(async error => {
            return await this.storeMissingMessages(error, messageData, interaction, member, messages, emoji, toDelete, isGlobal, page);
        });
    }

    async generateDiscoveryMessage (interaction, message, messageData, member, messages, emoji, toDelete, isGlobal = false, page = 0) {
        console.log("🚀 Showing ".gray + interaction.user.username + " a message by ".gray + message.author.username + " (page ".gray + (page + 1) + ")".gray);

        // Message
        const messageEmbed = await Pin.generateMessageEmbed(message);
        const messageKarma = await Pin.getKarmaTotalString(message, messageData);

        const buttons = await this.generateDiscoveryButtons(message, isGlobal, page, emoji);

        const reply = await interaction.editReply({ content: messageKarma, embeds: messageEmbed, components: [buttons] });

        // Delete messages
        if (toDelete.length > 0) {
            console.log("🗑️  Deleting".gray + toDelete.length + " invalid messages...".gray);
            await messageSchema.deleteMany({ messageId: { $in: toDelete } }); // Asynchronous?
            toDelete = [];
        }

        // Collector
        await this.generateDiscoveryCollector(reply, interaction, member, message, messages, emoji, toDelete, isGlobal, page);
    }

    async generateDiscoveryButtons (message, isGlobal, page, emoji) {
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
                .setEmoji(emoji.plus)
                .setStyle("Primary")
                .setCustomId("plus")
        );

        row.addComponents(
            new ButtonBuilder()
                .setEmoji(emoji.minus)
                .setStyle("Primary")
                .setCustomId("minus")
        );


        row.addComponents(
            new ButtonBuilder()
                .setEmoji("➡️")
                .setStyle("Secondary")
                .setCustomId("next")
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

    async getMessages (interaction, member, isGlobal) {
        let match = {};
        let sorting = {};

        // Variables
        const userInput = isGlobal ?  interaction.options.getUser("user") : interaction.options.getUser("member");
        const sortInput = interaction.options.getString("sort");

        // Member/guild lookup
        !isGlobal ? match.guildId = member.guild.id : match.karma = { $gt: 5 }; // Messages with >5 Karma
        if (userInput) match.userId = userInput.id;

        // Make sure we have a channel, too
        match.channelId = {$exists: true}

        // Sorting
        switch (sortInput) {
            case "random":
                sorting.$sample = { size: 100 };    // Arbitrary, we gotta make it so it's infinite later
                break;
            case "karma":
                sorting.$sort = { karma: -1 };     // Descending (highest to lowest)
                break;
            case "reverse-chronological":
                sorting.$sort = { createdAt: -1 }; // Descending (highest to lowest)
                break;
            case "chronological":
                sorting.$sort = { createdAt: 1 };  // Ascending (lowest to highest)
                break;
            default:
                sorting.$sample = { size: 100 };    // Random
                break;
        }

        // TO-DO: Censor (SFW/NSFW), Filter (Media, text, etc.)

        return await messageSchema.aggregate([
            { $match: match },
            sorting
        ]).exec();
    }

    async getDefaultReactableEmoji (interaction) {
        const reactables = await reactableSchema.find({
            guildId: interaction.guild.id
        }).exec();

        // TO-DO: When Custom Reactables are integrated, we might need to add more
        // conditions to make sure we don't depend on Reactable Name
        
        return {
            plus: reactables.find((reactable) => reactable.name === "plus").emoji || 
                  reactablePacks.reto.emoji.plus,
            minus: reactables.find((reactable) => reactable.name === "minus").emoji || 
                   reactablePacks.reto.emoji.minus,
            pin: reactables.find((reactable) => reactable.name === "pin").emoji ||
                 reactablePacks.reto.emoji.pin
        }
    }

    async reactToMessage (amount, message, interaction, member, messages, emoji, toDelete, isGlobal, page) {
        let isPositive = true;
        
        const reactable = await reactableSchema.findOne({
            guildId: message.guild.id,
            karmaAwarded: amount,
            globalKarma: true
        });

        const previouslyReacted = await ReactionCheck.checkIfPreviouslyReacted(
            message,
            interaction.user,
            reactable ? reactable : undefined,
            reactable ? false : true
        );

        if (previouslyReacted) isPositive = false;

        await Reaction.sendReactionToConsole(
            message, // No message.author
            interaction.user,
            reactable ? reactable : false,
            amount,
            true,
            true
        );

        // Store reaction, award Karma
        const karmaToAward = isPositive
            ? amount
            : amount * -1;
    
        const savedReaction = await Reaction.saveOrDeleteReaction(message, interaction.user, reactable, isPositive);
        console.log(savedReaction);
        if (!savedReaction) return;

        await Karma.awardKarmaToUser(
            karmaToAward,
            message.author,
            message,
            isGlobal // or if there's no reactable?
        );

        // Continue to next message
        // TO-DO: Consider just updating the current message (Tiktok-style) instead of skipping it (Tinder-style)
        const updatedMessage = messages.findIndex(messageData => messageData.messageId === message.id);
        messages[updatedMessage].karma = messages[updatedMessage].karma + karmaToAward;
        await this.findMessage(interaction, member, messages, emoji, toDelete, isGlobal, page + 1);
    }

    async storeMissingMessages (error, messageData, interaction, member, messages, emoji, toDelete, isGlobal, page) {
        const errorMessage = error == "channel" ? "channel" : error.message;
        
        if (errorMessage == "channel" || errorMessage == "Unknown Message") {
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

    async noMessages (interaction) {
        // TO-DO: Do another
        // If we ran out of messages
        await interaction.editReply({ content: "", components: [],embeds: [new EmbedBuilder()
            .setColor("Red")
            .setTitle("🚀 We couldn't find a message!")
            .setDescription(`
Either your server is very new to Reto (in which case, get reacting!), or you've seen all stored messages on your Server.`)] });
    }
}

module.exports = new Discover();