const { EmbedBuilder } = require("discord.js");
const { CommandType } = require("wokcommands");

module.exports = {
	category: 'Testing',
	description: 'Let\'s play ping-pong!',

	type: CommandType.SLASH,
	guildOnly: false,

	callback: ({ message, instance, interaction }) => {
		const latency = Date.now() - interaction.createdTimestamp;
		
        return {
			embeds: [
				new EmbedBuilder()
					.setColor("Red")
					.setTitle("🏓 Pong!")
					.setDescription("*Woah - that ball took `" + latency + "ms` to travel...!*")
			]
		}
	},
}