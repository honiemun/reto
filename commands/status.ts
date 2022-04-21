import { ICommand } from "wokcommands";

export default {
	category: 'Configuration',
	description: 'Sets the bots status.',

	minArgs: 1,
	expectedArgs: '<status>',

	slash: 'both',
	testOnly: true, // This only works for test servers!
	ownerOnly: true,

	callback: async ({ client, text }) => {
		client.user?.setPresence ({
			status: 'dnd',
			activities: [
				{
					name: text,
				}
			]
		});
	}
} as ICommand;