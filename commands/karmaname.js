const { MessageEmbed } = require("discord.js");
const I18n = require("../classes/i18n");
const ApplicationCommandOptionTypes = require("discord.js");
const Personalisation = require("../classes/personalisation");

module.exports = {
	category: 'Personalisation',
	description: 'Rename the Karma used on this server.',

	options: [
		{
			name: "karma-name",
			description: "The name to rename this server's local karma to.",
			required: true,
			type: "STRING"
		}
	],

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: true,

	callback: ({ member, instance, interaction }) => {
		Personalisation.changeGuildKarmaName(member.guild.id, interaction.options.getString("karma-name"))

        return new MessageEmbed()
            .setColor("GREEN")
            .setTitle("✔️ Server Karma changed!")
            .setDescription("The new name for this server's karma is *" + interaction.options.getString("karma-name") + "*.")
	},
}