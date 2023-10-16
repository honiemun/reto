const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");
const autoreactSchema = require("../schemas/autoreact");

// Classes
const Embed = require("../classes/embed");
const Formatting = require("../classes/formatting");

class Autoreact {
    
    constructor() {
        if (Autoreact._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Autoreact._instance = this;
    }

	async list(interaction) {
		const rules = await autoreactSchema.find({
			guildId: interaction.guild.id
		});

		if (!rules.length) {
            const error = await Embed.createErrorEmbed("This server doesn't have any Autoreact rules! Create some using `/autoreact edit`.");
            interaction.followUp({ embeds: [error] });
			return;
		}

		let embed = {
			title: "Autoreact Rules for " + interaction.guild.name,
			description: "These are the Autoreact rules for this server. You can edit them using `/autoreact edit`.\n",
			fields: []
		}

		// Generate list of channels
		let channels = [...new Set(rules.map(r => r.channelId))];

		for (const channel of channels) {
			let channelDescription = "";

			const rulesPerChannel = rules.filter(r => r.channelId === channel);

			for (const rulePerChannel of rulesPerChannel) {
				const reactable = await reactableSchema.findOne({
					_id: rulePerChannel.reactableId
				})

				// Uppercase formatting
				const name = reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1);
				const types = rulePerChannel.contentTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1).toLowerCase());

				channelDescription += "\n**" + name + "**\n> - " + types.join('\n> - ');
			}

			embed.fields.push({
				name: "<#" + channel + ">",
				value: channelDescription
			})
		}

		return interaction.editReply({embeds: [embed]});
	}

    async contentTypeSelector(interaction, reactable) {
		const reactableName = interaction.options.getString("reactable");
		const channel = interaction.options.getChannel("channel");
		
		const collector = await Embed.createAutoreactTypeSelectorEmbed(interaction);

		collector.on('collect', async i => {
			await this.saveAutoreactRule(interaction, i.values, reactable);

			const typesToText = await Formatting.arrayToCommaOrString(i.values);

			await interaction.editReply({ embeds: [ new EmbedBuilder()
				.setColor("Green")
				.setTitle("✔️ Autoreact settings updated!")
				.setDescription("Any messages on the <#" + channel + "> channel that include " + typesToText + " will now be auto-reacted with a **" + reactableName + "** reactable.")
				.setFooter({ text: "You can edit this using the same command, or delete this rule with /autoreact delete." })
			], components: []});
		});
    }

	async delete(interaction, reactable) {
		const reactableName = interaction.options.getString("reactable");
		const channel = interaction.options.getChannel("channel");
		
		const rule = await autoreactSchema.findOne({
			reactableId: reactable._id,
			channelId: channel.id
		}).exec();

		if (!rule) {
			// TO-DO: Make sure that the Autocomplete only shows rules that already exist,
			// so we don't have to use this in the first place.
            const error = await Embed.createErrorEmbed("No Autoreact rule for the <#" + channel + "> channel using the **" + reactableName + "** reactable exists.\nSee all the Autoreact rules available on this server with `/autoreact list`.");
            interaction.followUp({ embeds: [error] });
			return;
		}

		await this.deleteAutoreactRule(interaction, reactable);

		await interaction.editReply({ embeds: [ new EmbedBuilder()
			.setColor("Green")
			.setTitle("✔️ Autoreact rule deleted!")
			.setDescription("Any messages on the <#" + channel + "> channel will no longer be auto-reacted with **" + reactableName + "**.")
		], components: []});

	}

    async saveAutoreactRule(interaction, types, reactable) {
		const channel = interaction.options.getChannel("channel");

		await autoreactSchema.findOneAndUpdate(
			{
				reactableId: reactable._id,
				channelId: channel.id
			},
			{
				$set: {
					guildId: interaction.guild.id,
					contentTypes: types
				},
			},
			{ upsert: true }
		).exec();
    }

	async deleteAutoreactRule(interaction, reactable) {
		const channel = interaction.options.getChannel("channel");

		await autoreactSchema.deleteMany(
			{
				reactableId: reactable._id,
				channelId: channel.id
			},
		).exec();
	}

}

module.exports = new Autoreact();