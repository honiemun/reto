const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { CommandType } = require("wokcommands");

// Data
const brandingColors = require('../data/brandingColors');

module.exports = {
	category: 'About',
	description: 'If you need help with Reto, feel free to join the support server!',

	type: CommandType.SLASH,
	guildOnly: false,

	callback: ({ message, instance, interaction }) => {
		const latency = Date.now() - interaction.createdTimestamp;
		
        return {
			embeds: [
				new EmbedBuilder()
					.setColor(brandingColors.brightPink)
					.setTitle("Need some assistance?")
					.setDescription("If you need help with using Reto, found a bug that needs some fixing or you've got a feature request, please join the **Reto Labs** support server!")
			],

            components: [
                new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Support server')
                        .setStyle("Link")
                        .setURL(process.env.SUPPORT_SERVER)
                )
                
            ]
		}
	},
}