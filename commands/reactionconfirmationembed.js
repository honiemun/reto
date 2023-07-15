const Personalisation = require("../classes/personalisation");
const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");
const ApplicationCommandOptionType = require("discord.js");

module.exports = {
	category: 'Personalisation',
	description: 'Changes how the reaction embed looks whenever someone reacts to a message!',

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
			.setPlaceholder('Select a reactable');

		await reactableSchema.find({ guildId: member.guild.id })
        .cache(process.env.CACHE_TIME, member.guild.id + "-reactables")
		.then(async (reactables) => {
		// Delete all channels associated with reactables
			for (const reactable of reactables) {
				select.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1)) // Uppercase
						.setEmoji(reactable.emojiIds[0])
						.setValue(reactable.name)
				);
			}
		});

        const reactableSelect = await interaction.editReply({ embeds: [
			new EmbedBuilder()
				.setColor("Yellow")
				.setTitle("❓ Which reactable should we apply this embed to?")
				.setDescription("")
		], components: [ select ] })


		/*Personalisation.changeReactionEmbed(member.guild.id, interaction.options.getString("title"), interaction.options.getString("description"));

        return new EmbedBuilder()
            .setColor("Green")
            .setTitle("✔️ Reaction confirmations are updated!")
            .setDescription("This server will now use " + interaction.options.getString("mode") + "s to reply to reacted messages.")
			.setFooter({ text: "Want some more control over your embed? Add modifiers! Read all about them with /modifierlist." })
		*/
	},
}
