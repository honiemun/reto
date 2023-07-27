const { CommandType } = require("wokcommands");

const Embed = require("../classes/embed");

module.exports = {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	type: CommandType.SLASH,

	callback: async ({ interaction: msgInt, channel, member, client }) => {
		Embed.createEmbed('setup', msgInt, channel, member, client);
	},
}