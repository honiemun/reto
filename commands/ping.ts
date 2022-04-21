import { ICommand } from "wokcommands";

export default {
	category: 'Testing',
	description: 'Replies with Pong!',

	slash: 'both',
	testOnly: true, // This only works for test servers!

	callback: ({}) => {
		return '🏓 **Pong!**';
	},
} as ICommand