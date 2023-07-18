const { CommandType } = require("wokcommands");
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");

const Personalisation = require("../classes/personalisation");

module.exports = {
	category: 'Personalisation',
	description: 'Rename the Karma used on this server.',

	options: [
		{
			name: "karma-name",
			description: "The name to rename this server's local karma to.",
			required: true,
			type: ApplicationCommandOptionType.String
		}
	],

	type: CommandType.SLASH,
	guildOnly: true,

	callback: ({ member, instance, interaction }) => {
		
		Personalisation.changeGuildKarmaName(member.guild.id, interaction.options.getString("karma-name"))
		
        return interaction.reply({embeds: [ new EmbedBuilder()
            .setColor("Green")
            .setTitle("✔️ Server Karma changed!")
            .setDescription("The new name for this server's karma is *" + interaction.options.getString("karma-name") + "*.")
		]});
	},
}