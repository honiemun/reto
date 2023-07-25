const { EmbedBuilder } = require("discord.js");

// Classes
const Personalisation = require("../classes/personalisation");
const Embed = require("../classes/embed");

class GuildKarma {

    constructor() {
        if (GuildKarma._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        GuildKarma._instance = this;
    }
    
    async updateGuildKarmaEmoji(interaction, member, cmd) {
        let karmaEmoji;
        let confirmationMessage;

        switch (cmd) {
            case "set":
                karmaEmoji = interaction.options.getString("emoji");
                confirmationMessage = "The new emoji for this server's karma is " + interaction.options.getString("emoji") + ".";

                // Check if the emoji is valid
                const isEmoji = (str) => str.match(/((?<!\\)<:[^:]+:(\d+)>)|\p{Emoji_Presentation}|\p{Extended_Pictographic}/gmu);

                if (!isEmoji(interaction.options.getString("emoji"))) {
                    Embed.createErrorEmbed("`" + interaction.options.getString("emoji") + "` is not an emoji!").then(async function (errorEmbed) {
                        await interaction.followUp({ embeds: [ errorEmbed ], ephemeral: true })
                    })
                    return;
                }
        
                if (isEmoji(interaction.options.getString("emoji")).length > 1) {
                    Embed.createErrorEmbed("You can only set one emoji at a time!").then(async function (errorEmbed) {
                        await interaction.followUp({ embeds: [ errorEmbed ], ephemeral: true })
                    })
                    return;
                }

                break;
            
            case "default":
                karmaEmoji = null;
                confirmationMessage = "The emoji for this server's karma has been reset.";
                break;
        }

        Personalisation.changeGuildKarmaEmoji(member.guild.id, karmaEmoji)
        
            await interaction.editReply({ embeds: [ new EmbedBuilder()
                .setColor("Green")
                .setTitle("✔️ Server Karma updated!")
                .setDescription(confirmationMessage)
        ] });
        
    }
    
    async updateGuildKarmaName(interaction, member, cmd) {
        let karmaName;
        let confirmationMessage;
        
        switch (cmd) {
            case "set":
                karmaName = interaction.options.getString("name");
                confirmationMessage = "The new name for this server's karma is *" + interaction.options.getString("name") + "*.";
                break;
            
            case "default":
                karmaName = null;
                confirmationMessage = "The name for this server's karma has been reset.";
                break;
        }

		Personalisation.changeGuildKarmaName(member.guild.id, karmaName)
		
        return interaction.editReply({embeds: [ new EmbedBuilder()
            .setColor("Green")
            .setTitle("✔️ Server Karma changed!")
            .setDescription(confirmationMessage)
		]});
    }
}

module.exports = new GuildKarma();