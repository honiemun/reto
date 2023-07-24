const { CommandType } = require("wokcommands");
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const mongoose = require('mongoose');

const Personalisation = require("../classes/personalisation");
const Embed = require("../classes/embed");

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
	guildOnly: true,

	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

		const reactables = await reactableSchema.find({ guildId: member.guild.id });
		const collector = await Embed.createReactableSelectorEmbed(interaction, reactables, true, '❓ Which reactable should we apply this embed to?')

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
