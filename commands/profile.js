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
		let user;

		if (interaction.options.getUser("user")) {
			user = interaction.options.getUser("user"); // Specified an User
		} else if (member) {
			user = member;							 // You're in a guild
		} else {
			user = interaction.user;				 // You're on DMs
		}

		if (user == null) return; // TO-DO: Throw an error!
		

		Profile.fetchProfileEmbed(user, member, instance, interaction).then((embed) => {
			if (!embed) return;
			return interaction.editReply({embeds: [ embed ]})
		});
	},
}