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

	callback: async ({ interaction, channel, member, client }) => {
		await interaction.deferReply();
		
		return await Embed.createEmbed('setup', interaction, channel, member, client);
	},
}