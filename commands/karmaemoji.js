const I18n = require("../classes/i18n");
const ApplicationCommandOptionTypes = require("discord.js");
const Personalisation = require("../classes/personalisation");

module.exports = {
	category: 'Personalisation',
	description: 'Change the Karma emoji used on this server.',

	options: [
		{
			name: "emoji",
			description: "The emoji to set this server's local karma to.",
			required: true,
			type: ApplicationCommandOptionTypes.EMOJI
		}
	],

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: true,

	callback: ({ member, instance, interaction }) => {
		Personalisation.changeGuildKarmaEmoji(member.guild.id, interaction.options.getString("emoji"))
		return 'Karma emoji changed.'
	},
}