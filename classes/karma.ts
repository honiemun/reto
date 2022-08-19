import userSchema from '../schemas/user';
import memberSchema from '../schemas/member';
import messageSchema from '../schemas/message';
import { User } from 'discord.js';

export default class Karma {
	static async awardKarmaToUser (karmaToAward: number, userId: User | null, guildId: string | null, messageId: string | null) {

		// Update the user's global karma
		await userSchema.findOneAndUpdate(
			{ userId: userId },
			{ $inc : { 'globalKarma' : karmaToAward } },
			{ upsert: true }
		).exec();
	
		// Update the member's karma on the specified guild
		await memberSchema.findOneAndUpdate(
			{ userId: userId, guildId: guildId },
			{ $inc : { 'karma' : karmaToAward } },
			{ upsert: true }
		).exec();

		// Update the message's karma
		// TO-DO: Check for user's canStoreMessages permission first
		await messageSchema.findOneAndUpdate(
			{ messageId: messageId },
			{
				$set: { 'userId': userId, 'guildId': guildId },
				$inc : { 'karma' : karmaToAward }
			},
			{ upsert: true }
		).exec();
	}

	static async sendKarmaNotification (reactable: Object, reactionConfirmation: String, customEmoji: String, message: any) {
		// Get guild's reactionConfirmation
		switch (reactionConfirmation) {
			case "Message":
				console.log("penis");
			case "Reaction":
				const reactionEmoji = customEmoji ? customEmoji : "😄" // TODO: Change to Retool Discord emoji
				message.react(reactionEmoji).then((reaction: any) => {
					setTimeout(() => {
						reaction.remove();
					}, 3 * 1000);
				})
			default:
				return;
		}
	}
}