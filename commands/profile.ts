import Profile from '../classes/profile';
import { ICommand } from "wokcommands";
import { ApplicationCommandOptionTypes } from 'discord.js/typings/enums';
import { MessageEmbed } from 'discord.js';

export default {
	category: 'Profiles',
	description: 'Shows you (or another user\'s) Reto Profile.',

	options: [
		{
			name: "user",
			description: "The user to check the profile of.",
			required: false,
			type: ApplicationCommandOptionTypes.USER
		}
	],

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: false,

	callback: ({ message, interaction, args, member }) => {
		const user = interaction.options.getUser("user") ? interaction.options.getUser("user") : member
		if (user == null) return

		// TO-DO: Turn this into a return-based thing.
		Profile.fetchProfileEmbed(user).then((embed) => {
			if (!embed) return;
			interaction.channel?.send({embeds: [ embed ]})
		});
	},
} as ICommand