const { EmbedBuilder } = require("discord.js");
const { CommandType } = require("wokcommands");

module.exports = {
	category: 'Testing',
	description: 'Let\'s play ping-pong!',

	type: CommandType.SLASH,
	guildOnly: false,

	callback: ({ message, instance, interaction }) => {
		// For some reason, still shows old message...?
		const latency = Date.now() - interaction.createdTimestamp;
		
        return new EmbedBuilder()
            .setColor("Red")
            .setTitle("🏓 Pong!")
            .setDescription("*Woah - that ball took `" + latency + "ms` to travel...!*")
	},
}