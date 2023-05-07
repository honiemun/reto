const { Message, PartialMessage, User, PartialUser } = require('discord.js');

// Schemas
const guildSchema = require("../schemas/guild");
const reactableSchema = require("../schemas/reactable");
const reactionSchema = require('../schemas/reaction');

// Classes
const Test = require("./pintest")
const Pin = require("./pin")
const Karma = require("./karma")

module.exports = class Reaction {
    
    static async messageReactionHandler (reaction, user, isPositive) {
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;
        // TO-DO: Return if the reactor is the same as the author.

        const guildDocument = await guildSchema.findOne({
            guildId: reaction.message.guildId
        }).exec();
        
        const guildReactables = await reactableSchema.find({
            guildId: reaction.message.guildId
        }).exec();

        if (!guildReactables) return;

        for (const reactable of guildReactables) {

        const reactableIsValid = reactable.emojiIds.includes(reaction.emoji.name)
            || reactable.emojiIds.includes(reaction.emoji.id);

        if (!reactableIsValid) continue;

        const karmaToAward = isPositive
            ? reactable.karmaAwarded
            : reactable.karmaAwarded * -1;

        // Replace message with pinned message, if it exists
        //console.log(Object.getOwnPropertyNames(Test.prototype));
        await Test.test();
        const message = await Test.getStoredPinnedMessage(reaction.message).then((pinnedMessage) => {
            if (pinnedMessage) {
            // TO-DO: Can this be simplified?
            return reaction.message.client.channels.fetch(pinnedMessage.channelId).then((channel) => {
                return channel.messages.fetch(pinnedMessage.messageId);
            })
            } else return reaction.message;
        })

        if (!message.author) return;
        
        console.log('💕 ' + message.author.username + "'s message has been reacted to (" + karmaToAward + ")");

        // Check if the reaction isn't duplicated
        const amountReacted = await Reaction.checkIfPreviouslyReacted(message, user, reactable)
        if (amountReacted && isPositive) return; // Exit if the message has been reacted (positive)
        else if (amountReacted < 1 && !isPositive) return; // Exit if the message hasn't been reacted (negative)

        // Store reaction
        const savedReaction = await Reaction.saveOrDeleteReaction(message, user, reactable, isPositive);
        if (!savedReaction) return;

        // Award the karma total to user
        await Karma.awardKarmaToUser(
            karmaToAward,
            message.author,
            message
        )

        // Send message to channel
        await Test.pinMessageToChannel(
            message,
            reactable,
            message.client,
            user
        )

        // Send notification
        await Karma.sendKarmaNotification(reaction.message, guildDocument, reactable);
        }
    }

    static async saveOrDeleteReaction (message, reactingUser, reactable, toSave) {
        //if (await this.checkIfPreviouslyReacted(message, reactingUser, reactable)) return false;

        if (toSave) await this.saveReaction(message, reactingUser, reactable);
        else await this.deleteReaction(message, reactingUser, reactable);
        return true;
    }

    static async saveReaction (message, reactingUser, reactable) {
        return new reactionSchema({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).save();
    }

    static async deleteReaction (message, reactingUser, reactable) {
        return reactionSchema.deleteMany({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).exec();
    }

    static async checkIfPreviouslyReacted (message, reactingUser, reactable) {
        const reactions = await reactionSchema.find({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).exec();

        return reactions.length;
    }

    // Currently goes un-used - the reactionHandler recursively deletes
    // every reaction if this is implemented.
    /*
    static async undoReaction (message: Message | PartialMessage, reactingUser: User | PartialUser) {
        const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(reactingUser.id));

        try {
            for (const reaction of userReactions.values()) {
                await reaction.users.remove(reactingUser.id);
            }
        } catch (error) {
            console.error("💔 Couldn't remove the user's repeated reaction");
        }
    }
    */

}