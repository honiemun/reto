const { CommandType } = require("wokcommands");

const Personalisation = require("../classes/personalisation");

module.exports = {
	category: 'Personalisation',
	description: 'Sends a list of all the things you can do with Reto on this server!',

	type: CommandType.SLASH,
	guildOnly: true,

	callback: async ({ client, interaction, member }) => {
        await Personalisation.createGuideEmbed(client, member.guild).then(embed => {
            interaction.reply({embeds: [embed]})
        })
	},
}