const { CommandType } = require("wokcommands");
const { PermissionFlagsBits } = require("discord.js");

const Embed = require("../classes/embed");

module.exports = {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	type: CommandType.SLASH,
	guildOnly: true,

    permissions: [
		PermissionFlagsBits.ManageChannels |
		PermissionFlagsBits.ManageRoles |
		PermissionFlagsBits.ManageGuildExpressions
	],

	callback: async ({ interaction: msgInt, channel, member, client }) => {
		return await Embed.createEmbed('setup', msgInt, channel, member, client);
	},
}