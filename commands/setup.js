const Embed = require("../classes/embed");

module.exports = {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	slash: 'both',
	testOnly: true, // This only works for test servers!

	callback: async ({ interaction: msgInt, channel, guild, member }) => {
		Embed.createEmbed('setup', msgInt, channel, member);
	},
}