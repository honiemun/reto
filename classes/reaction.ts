import { Message, PartialMessage, User, PartialUser } from 'discord.js';
import reactionSchema from '../schemas/reaction';

export default class Reaction {
    static async saveOrDeleteReaction (message: Message | PartialMessage, reactingUser: User | PartialUser, reactable: any, toSave: Boolean) {
        if (await this.checkIfPreviouslyReacted(message, reactingUser, reactable) && toSave) return false;

        if (toSave) await this.saveReaction(message, reactingUser, reactable);
        else await this.deleteReaction(message, reactingUser, reactable);
        return true;
    }

    static async saveReaction (message: Message | PartialMessage, reactingUser: User | PartialUser, reactable: any) {
        return new reactionSchema({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).save();
    }

    static async deleteReaction (message: Message | PartialMessage, reactingUser: User | PartialUser, reactable: any) {
        return reactionSchema.deleteMany({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).exec();
    }

    static async checkIfPreviouslyReacted (message: Message | PartialMessage, reactingUser: User | PartialUser, reactable: any) {
        return reactionSchema.find({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).then((reactions) => {
            return Boolean(reactions.length)
        })
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