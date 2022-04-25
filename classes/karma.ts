import userSchema from '../schemas/user';
import memberSchema from '../schemas/member';

export default class Karma {
	static async awardKarmaToUser (karmaToAward: Number, userId: string, guildId: string | null) {
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

		// TO-DO: Add points to a Message object
	}
}