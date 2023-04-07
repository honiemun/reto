const { Message, PartialMessage, User, PartialUser } = require('discord.js');
const reactionSchema = require('../schemas/reaction');

module.exports = class Reaction {
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