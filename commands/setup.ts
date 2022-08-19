import Embed from '../classes/embed';
import { ICommand } from "wokcommands";

export default {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	slash: 'both',
	testOnly: true, // This only works for test servers!

	callback: async ({ interaction: msgInt, channel, guild }) => {
		Embed.createEmbed('chooseSetupType', msgInt, channel);
	},
} as ICommand