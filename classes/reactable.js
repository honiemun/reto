const { EmbedBuilder } = require("discord.js");
const mongoose = require('mongoose');

// Classes
const Personalisation = require("../classes/personalisation");
const Embed = require("../classes/embed");
const Premium = require("../classes/premium");

// Schemas
const guildSchema = require("../schemas/guild");
const reactableSchema = require("../schemas/reactable");

class Reactable {

    constructor() {
        if (Reactable._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Reactable._instance = this;
    }
    
    async updateReactablePinAmount(interaction, member) {
        // Reto Gold exclusive command - exit if guild doesn't have a subscription
		const guild = await guildSchema.find({ guildId: member.guild.id });
        console.log("Let's go!")
        const premiumMessage = await Premium.sendGuildPremiumMessage(guild);
        if (premiumMessage) {
            return interaction.editReply(premiumMessage);
        }

		const reactables = await reactableSchema.find({
			guildId: member.guild.id,
			sendsToChannel: { $ne: null } // Only show reactables that send message to channel
		}).exec();

		if (!reactables.length) {
			Embed.createErrorEmbed("There are no reactables on your server that pin messages to a channel!\n_(You can set one by using `/pin channel set`.)_").then(async function (errorEmbed) {
				await interaction.editReply({ embeds: [ errorEmbed ] })
			})
			return;
		}


        const reactionPlural = interaction.options.getNumber("amount") > 1 ? " reactions" : " reaction";
		const collector = await Embed.createReactableSelectorEmbed(interaction, reactables, false,
            '❓ Which reactable will need ' + interaction.options.getNumber("amount") + reactionPlural + ' to pin a message?');

		collector.on('collect', async i => {
			const reactableId = mongoose.Types.ObjectId(i.values[0]);
            
			Personalisation.updatePinningThreshold(reactableId, interaction.options.getNumber("amount"));

			await i.reply({ embeds: [ new EmbedBuilder()
				.setColor("Green")
				.setTitle("✔️ Reactable updated!")
				.setDescription("You'll now need " + interaction.options.getNumber("amount") + reactionPlural + " (or more) to pin a message with this reactable.")
			]});
		});
    }

    async updateReactablePinChannel(interaction, member, cmd) {
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

		const reactables = await reactableSchema.find(findObject).exec();

        // Send error if you're trying to disable pin on server with no pinning reactables
        if (!reactables.length && cmd == "disable") {
			Embed.createErrorEmbed("There are no reactables on your server that pin messages to a channel!\n_(You can set one by using `/pin channel set`.)_").then(async function (errorEmbed) {
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
    }
}

module.exports = new Reactable();