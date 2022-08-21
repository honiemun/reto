import userSchema from '../schemas/user';
import memberSchema from '../schemas/member';
import messageSchema from '../schemas/message';
import { User, PartialUser, Message, PartialMessage } from 'discord.js';

export default class Karma {
	static async awardKarmaToUser (karmaToAward: number, userId: User | PartialUser | null, guildId: string | null, messageId: string | null) {
		if (karmaToAward == 0) return;

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

	static async sendKarmaNotification (message: Message | PartialMessage, guildDocument: any) {
		if (guildDocument.messageConfirmation) {
			// TO-DO: Implement message confirmation
			console.log("penis");
		} else {
			const reactionEmoji = guildDocument.customEmoji ? guildDocument.customEmoji : "😄" // TODO: Change to Retool Discord emoji
			message.react(reactionEmoji).then((reaction: any) => {
				setTimeout(() => {
					reaction.remove();
				}, 3 * 1000);
			})
		}
	}
}