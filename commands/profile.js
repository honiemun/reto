const Profile = require("../classes/profile");
const ApplicationCommandOptionType = require("discord.js");

module.exports = {
	category: 'Profiles',
	description: 'Shows you (or another user\'s) Reto Profile.',

	options: [
		{
			name: "user",
			description: "The user to check the profile of.",
			required: false,
			type: ApplicationCommandOptionType.User
		}
	],

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: false,

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