const { CommandType } = require("wokcommands");

const Guide = require("../../classes/guide");

module.exports = {
	category: 'Personalisation',
	description: 'Sends a list of all the things you can do with Reto on this server!',

	type: CommandType.SLASH,
	guildOnly: true,

	callback: async ({ client, interaction, member }) => {
        await Guide.createGuideEmbed(client, member.guild).then(embed => {
            interaction.reply({embeds: [embed]})
        })
	},
}