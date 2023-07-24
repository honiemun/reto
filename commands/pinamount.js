const { CommandType } = require("wokcommands");
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const mongoose = require('mongoose');

// Classes
const Embed = require("../classes/embed");
const Personalisation = require("../classes/personalisation");
const Premium = require("../classes/premium");

// Schemas
const guildSchema = require("../schemas/guild");
const reactableSchema = require("../schemas/reactable");

module.exports = {
	category: 'Personalisation',
	description: 'Sets the amount of reactions needed on a specific reactable to pin a message. [Reto Gold]',

	type: CommandType.SLASH,
	guildOnly: false,

	options: [
		{
			name: "amount",
			description: "The threshold of reactions needed to pin a message.",
			required: true,
			type: ApplicationCommandOptionType.Number
		}
	],

	slash: 'both',
	guildOnly: true,

	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        // Reto Gold exclusive command - exit if guild doesn't have a subscription
		const guild = await guildSchema.find({ guildId: member.guild.id });
        const premiumMessage = await Premium.sendGuildPremiumMessage(guild);
        if (premiumMessage) {
            return interaction.editReply(premiumMessage);
        }

		const reactables = await reactableSchema.find({
			guildId: member.guild.id,
			sendsToChannel: { $ne: null } // Only show reactables that send message to channel
		}).exec();

		if (!reactables.length) {
			Embed.createErrorEmbed("There are no reactables on your server that pin messages to a channel!\n_(You can set one by using `/pinchannel set`.)_").then(async function (errorEmbed) {
				await interaction.editReply({ embeds: [ errorEmbed ] })
			})
			return;
		}

		const collector = await Embed.createReactableSelectorEmbed(interaction, reactables, false,
            '❓ Which reactable will need ' + interaction.options.getNumber("amount") + ' reactions to pin a message?');

		collector.on('collect', async i => {
			const reactableId = mongoose.Types.ObjectId(i.values[0]);
            
			Personalisation.updatePinningThreshold(reactableId, interaction.options.getNumber("amount"));

			await i.reply({ embeds: [ new EmbedBuilder()
				.setColor("Green")
				.setTitle("✔️ Reactable updated!")
				.setDescription("You'll now need " + interaction.options.getNumber("amount") + " reactions (or more) to pin a message with this reactable.")
			]});
		});
	},
}
