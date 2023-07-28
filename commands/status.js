const { CommandType } = require("wokcommands");

module.exports = {
	category: 'Configuration',
	description: 'Sets the bots status.',

	minArgs: 1,
	expectedArgs: '<status>',

	type: CommandType.SLASH,
	ownerOnly: true,

	callback: async ({ client, text }) => {
		client.user.setPresence ({
			status: 'dnd',
			activities: [
				{
					name: text,
				}
			]
		});

		return '✨ Status set to `' + text + '`!';
	}
}