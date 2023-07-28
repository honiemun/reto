const { CommandType } = require("wokcommands");
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const mongoose = require('mongoose');

// Classes
const Personalisation = require("../classes/personalisation");
const Embed = require("../classes/embed");

// Schemas
const reactableSchema = require("../schemas/reactable");

class ReactionConfirmation {

    constructor() {
        if (ReactionConfirmation._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        ReactionConfirmation._instance = this;
    }
    
    async updateReactionConfirmationMode(interaction, member) {
        Personalisation.changeMessageReplyMode(member.guild.id, interaction.options.getString("mode") == "embed" ? true : false);

        return interaction.editReply({embeds: [ new EmbedBuilder()
            .setColor("Green")
            .setTitle("✔️ Reaction confirmations are updated!")
            .setDescription("This server will now use **" + interaction.options.getString("mode") + "s** to reply to reacted messages.")
            .setFooter({ text: "You can change how the embeds look with /reactionconfirmationembed!" })
        ] });
    }

    async updateReactionConfirmationEmbed(interaction, member, cmd) {
        let embedTitle;
        let embedDescription;
        let selectorTitle;
        let confirmationMessage;
        let findObject;
        
        switch (cmd) {
            case "set":
                embedTitle = interaction.options.getString("title");
                embedDescription = interaction.options.getString("description");
                selectorTitle = '❓ Which reactable should we apply this embed to?'
                confirmationMessage = "This server will now use this embed to reply to reacted messages, if the bot's reaction mode is set to Embed.";
                findObject = {
                    guildId: member.guild.id
                };
                break;
            
            case "default":
                embedTitle = null;
                embedDescription = null;
                selectorTitle = '❓ Which reactable should we reset the embed of?'
                confirmationMessage = "The embed this reactable sends has been reset.";
                findObject = {
                    guildId: member.guild.id,
                    reactionConfirmationTitle: { $ne: null },
                    reactionConfirmationDescription: { $ne: null }
                };
                break;
        }
        
		const reactables = await reactableSchema.find(findObject);
        
		if (!reactables.length && cmd == "default") {
			Embed.createErrorEmbed("There are no reactables that have a custom reaction confirmation embed set!").then(async function (errorEmbed) {
				await interaction.editReply({ embeds: [ errorEmbed ] })
			})
			return;
		}

		const collector = await Embed.createReactableSelectorEmbed(interaction, reactables, true, selectorTitle)

		collector.on('collect', async i => {
			const reactableId = i.values[0];

			if (reactableId == "all") {
				for (reactable of reactables) {
					Personalisation.changeReactionEmbed(reactable._id, embedTitle, embedDescription);
				}
			} else {
				Personalisation.changeReactionEmbed(mongoose.Types.ObjectId(reactableId), embedTitle, embedDescription);
			}

			await i.reply({ embeds: [ new EmbedBuilder()
				.setColor("Green")
				.setTitle("✔️ Reaction confirmations are updated!")
				.setDescription(confirmationMessage)
				.setFooter({ text: "Want some more control over your embed? Add modifiers! Read all about them with /modifierlist." })
			]});
		});
    }
}

module.exports = new ReactionConfirmation();

