import Embed from '../classes/embed';
import { ICommand } from "wokcommands";

export default {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	slash: 'both',
	testOnly: true, // This only works for test servers!

	callback: async ({ interaction: msgInt, channel, guild, member }) => {
		Embed.createEmbed('setup', msgInt, channel, member);
	},
} as ICommand