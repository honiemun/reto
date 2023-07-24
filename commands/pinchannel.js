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
	description: 'Manages the channel that a reactable will pin a message to.',

	type: CommandType.SLASH,
	guildOnly: false,

	options: [
        {
            name: "set",
            description: "Sets the channel that a reactable will pin a message to.",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "channel",
                    description: "The threshold of reactions needed to pin a message.",
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                }
            ]
        },
		{
			name: "disable",
			description: "Disables pinning messages with a reactable.",
            type: ApplicationCommandOptionType.Subcommand
		}
	],

	slash: 'both',
	guildOnly: true,

	callback: async ({ interaction, member }) => {
        
        const cmd = interaction.options.getSubcommand();
        
        let selectMessage;
        let updateMessage;
        let confirmMessage;
        let findObject;

        switch (cmd) {
            case "set":
                selectMessage = '❓ Which reactable will send this message to #' + interaction.options.getChannel("channel").name + '?'
                confirmMessage = "Reacting to a message with this reactable will now send it to the <#" + interaction.options.getChannel("channel") + "> channel."
                updateMessage = "Channel"
                findObject = {
                    guildId: member.guild.id
                }
                break;
            case "disable":
                selectMessage = '❓ What reactable do you want to disable message pinning on?'
                confirmMessage = "This reactable will no longer pin messages when reacted to."
                updateMessage = "Reactable"
                findObject = {
                    guildId: member.guild.id,
                    sendsToChannel: { $ne: null } // Only show reactables that send message to channel
                }
                break;
        }

		await interaction.deferReply();

		const reactables = await reactableSchema.find(findObject).exec();

        // Send error if you're trying to disable pin on server with no pinning reactables
        if (!reactables.length && cmd == "disable") {
			Embed.createErrorEmbed("There are no reactables on your server that pin messages to a channel!\n_(You can set one by using `/pinchannel set`.)_").then(async function (errorEmbed) {
				await interaction.editReply({ embeds: [ errorEmbed ] })
			})
			return;
		}

		const collector = await Embed.createReactableSelectorEmbed(interaction, reactables, false, selectMessage);

		collector.on('collect', async i => {
			const reactableId = mongoose.Types.ObjectId(i.values[0]);
            const channelToUpdate = cmd == "set" ? interaction.options.getChannel("channel") : null

			Personalisation.updatePinChannel(reactableId, channelToUpdate);

			await i.reply({ embeds: [ new EmbedBuilder()
				.setColor("Green")
				.setTitle("✔️ " + updateMessage + " updated!")
				.setDescription(confirmMessage)
			]});
		});
	},
}
