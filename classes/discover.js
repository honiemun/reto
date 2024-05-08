//const { CommandInteraction, Message } = require('discord.js');

// Schemas
const messageSchema = require('../schemas/message');

// Classes
const Pin = require("../classes/pin");

class Discover {

    constructor() {
        if (Discover._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Discover._instance = this;
    }

    async generate (interaction, member, isGlobal = false) {
        const messages = await this.getMessages(interaction, member, isGlobal);
        
        // Real chicken and egg shit
        // we need channel id to fetch message, we need message id to get the channel
        // or we could've added it to the db in legacy idk
        const channel = interaction.client.channels.cache.get(messages[10].channelId);
        console.log(channel);
        channel.messages.fetch(messages[0].messageId).then(async (message) => {
            console.log(message);
            const messageEmbed = await Pin.generateMessageEmbed(message);

            await interaction.editReply({ embeds: [messageEmbed] });
        });
    }

    async getMessages (interaction, member, isGlobal) {
        let match = {};
        let sorting = {};

        // Variables
        const userInput = isGlobal ?  interaction.options.getUser("user") : interaction.options.getUser("member");
        const sortInput = interaction.options.getString("sort");

        // Member/guild lookup
        !isGlobal ? match.guildId = member.guild.id : match.karma = { $gt: 5 }; // Messages with >5 Karma
        if (userInput) match.userId = userInput.id;

        // Sorting
        switch (sortInput) {
            case "random":
                sorting.$sample = { size: 25 };    // Arbitrary, we gotta make it so it's infinite later
                break;
            case "karma":
                sorting.$sort = { karma: -1 };     // Descending (highest to lowest)
                break;
            case "reverse-chronological":
                sorting.$sort = { createdAt: -1 }; // Descending (highest to lowest)
                break;
            case "chronological":
                sorting.$sort = { createdAt: 1 };  // Ascending (lowest to highest)
                break;
            default:
                sorting.$sample = { size: 25 };    // Random
                break;
        }

        // TO-DO: Censor (SFW/NSFW), Filter (Media, text, etc.)

        return await messageSchema.aggregate([
            { $match: match },
            sorting
        ]);
    }
}

module.exports = new Discover();