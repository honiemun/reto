const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

const Profile = require("../classes/profile");

module.exports = {
	category: 'Profiles',
	description: 'Shows you (or another user\'s) Reto Profile.',

	type: CommandType.SLASH,
	guildOnly: false,

	options: [
		{
			name: "user",
			description: "The user to check the profile of.",
			required: false,
			type: ApplicationCommandOptionType.User
		}
	],
	
	callback: ({ instance, interaction, member }) => {
		interaction.deferReply();
		const user = interaction.options.getUser("user") ? interaction.options.getUser("user") : member
		if (user == null) return
		
		Profile.fetchProfileEmbed(user, member, instance, interaction).then((embed) => {
			if (!embed) return;
			return interaction.editReply({embeds: [ embed ]})
		});
	},
}