const { ActionRowBuilder, ButtonBuilder } = require('discord.js');

const Formatting = require("../classes/formatting");
const { forEach } = require("../data/defaultReactables");

module.exports = {
	category: 'Personalisation',
	description: 'Shows a complete list of every modifier that can be used for customising text.',

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: false,

	callback: async ({ user, message, instance, interaction, channel }) => {
		await interaction.deferReply();
		const formattingCategories = await Formatting.getFormattingDescriptions(message);
		const embeds = [];
		const pages = {}
		
		for (const [name, formattingCategory] of Object.entries(formattingCategories)) {
			let generatedEmbed = {
				"title": name,
				"description": "** **",
				"fields": []
			}

			for (const [identifier, rule] of Object.entries(formattingCategory)) {
				generatedEmbed.fields.push({
					"name": "`{" + identifier + "}` - " + rule.name,
					"value": rule.description
				});
			}

			embeds.push(generatedEmbed);
		}

		const getRow = (id) => {
			const row = new ActionRowBuilder()

			row.addComponents(
				new ButtonBuilder()
					.setCustomId('prev_embed')
					.setStyle('Secondary')
					.setEmoji('⬅️')
					.setDisabled(pages[id] === 0)
			);
			row.addComponents(
				new ButtonBuilder()
					.setCustomId('next_embed')
					.setStyle('Secondary')
					.setEmoji('➡️')
					.setDisabled(pages[id] === embeds.length - 1)
			);

			return row;
		}

		const id = user.id;
		pages[id] = pages[id] || 0;

		let embed = embeds[pages[id]];
		let reply;
		let collector;

		const filter = (i) => i.user.id === user.id
		const time = 1000 * 60 * 5

		await interaction.editReply({
			embeds: [ embed ],
			components: [ getRow(id) ]
		})

		// Check for tab change
		collector = channel.createMessageComponentCollector({ filter, time });

		collector.on('collect', async (interaction) => {
			if (!interaction) { return; }

			await interaction.deferUpdate();
			
			// Only respond to these two!
			if (interaction.customId !== 'prev_embed' && interaction.customId !== 'next_embed') { return; }

			if (interaction.customId === 'prev_embed' && pages[id] > 0) {
				--pages[id];
			} else if (interaction.customId === 'next_embed' && pages[id] < embeds.length - 1) {
				++pages[id];
			}

			embed = embeds[pages[id]];
			
			await interaction.editReply({
				embeds: [ embed ],
				components: [ getRow(id) ]
			});
		});
	},
}