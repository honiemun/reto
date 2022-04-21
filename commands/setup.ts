import { ICommand } from "wokcommands";

// Schemas
import guildSchema from '../schemas/guild';

export default {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	slash: 'both',
	testOnly: true, // This only works for test servers!

	callback: async ({ guild }) => {
		await guildSchema.findOneAndUpdate({ guildId: guild?.id }, {
			guildId: guild?.id,
			karmaName: guild?.name + ' Karma',
			reactionables: [
				{
					// The default PLUS element.
					guildId: guild?.id,
					defaultEmojiId: '👍',
					karmaAwarded: 1,
					globalKarma: true,
				},
				{
					// The default MINUS element.
					guildId: guild?.id,
					defaultEmojiId: '👎',
					karmaAwarded: -1,
					globalKarma: true,
				},
			]
		}, { upsert: true });

		return "Done!";
	},
} as ICommand