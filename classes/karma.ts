import userSchema from '../schemas/user';
import memberSchema from '../schemas/member';
import messageSchema from '../schemas/message';

export default class Karma {
	static async awardKarmaToUser (karmaToAward: number, userId: string, guildId: string | null, messageId: string | null) {

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
		await messageSchema.findOneAndUpdate(
			{ messageId: messageId },
			{
				$set: { 'userId': userId, 'guildId': guildId },
				$inc : { 'karma' : karmaToAward }
			},
			{ upsert: true }
		).exec();
	}
}