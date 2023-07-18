const { CommandType } = require("wokcommands");
const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
		ActionRowBuilder, ApplicationCommandOptionType, ComponentType } = require("discord.js");
const mongoose = require('mongoose');

const Personalisation = require("../classes/personalisation");

// Schemas
const reactableSchema = require("../schemas/reactable");

module.exports = {
	category: 'Personalisation',
	description: 'Changes how the reaction embed looks whenever someone reacts to a message!',

	type: CommandType.SLASH,
	guildOnly: false,

	options: [
		{
			name: "title",
			description: "The header of the embed.",
			required: true,
			type: ApplicationCommandOptionType.String
		},
		{
			name: "description",
			description: "The contents of the embed.",
			required: true,
			type: ApplicationCommandOptionType.String
		}
	],

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: false,

	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

		// Select (alternative, not working)

		const select = new StringSelectMenuBuilder()
			.setCustomId('selectedReactable')
			.setPlaceholder('Select a reactable')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("All reactables") // Uppercase
					.setValue("all")
			);

		const reactables = await reactableSchema.find({ guildId: member.guild.id });
		
		for (const reactable of reactables) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1)) // Uppercase
					.setEmoji(reactable.emojiIds[0])
					.setValue(reactable._id.toString())
			);
		}
		
		const row = new ActionRowBuilder()
			.addComponents(select);

        const reactableSelect = await interaction.editReply({ embeds: [
			new EmbedBuilder()
				.setColor("Yellow")
				.setTitle("❓ Which reactable should we apply this embed to?")
				.setDescription("Pick a reactable from the list below!")
		], components: [ row ] })


		const collector = reactableSelect.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

		collector.on('collect', async i => {
			const reactableId = i.values[0];

			if (reactableId == "all") {
				for (reactable of reactables) {
					Personalisation.changeReactionEmbed(reactable._id, interaction.options.getString("title"), interaction.options.getString("description"));
				}
			} else {
				Personalisation.changeReactionEmbed(mongoose.Types.ObjectId(reactableId), interaction.options.getString("title"), interaction.options.getString("description"));
			}

			await i.reply({ embeds: [ new EmbedBuilder()
				.setColor("Green")
				.setTitle("✔️ Reaction confirmations are updated!")
				.setDescription("This server will now use this embed to reply to reacted messages, if the bot's reaction mode is set to Embed.")
				.setFooter({ text: "Want some more control over your embed? Add modifiers! Read all about them with /modifierlist." })
			]});
		});
	},
}
