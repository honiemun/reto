// Dependencies
const { REST, Routes, EmbedBuilder } = require('discord.js');

// Schemas
const messageSchema = require('../schemas/message');

// Classes
const Formatting = require('./formatting');

class Debug {

    constructor() {
        if (Debug._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Debug._instance = this;
    }
    
    async deleteCommands(interaction) {
        // TO-DO: Only support for Global commands

        const id = interaction.options.getString("id");
        let confirmation;

        const rest = new REST().setToken(process.env.TOKEN);

        if (id) {
            confirmation = 'Successfully deleted the Slash Command (with the ID `' + id + '`).';

            rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, id))
                .then(() => console.log(confirmation))
                .catch(console.error);
        } else {
            confirmation = 'Successfully deleted all Slash Commands.';

            rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
                .then(() => console.log(confirmation))
                .catch(console.error);
        }

        interaction.editReply(confirmation);
    }

    async fillChannelsInMessages(interaction) {
        // Get list of guilds the bot is on
        let clientGuilds = interaction.client.guilds.cache.map(g => g.id);
        let messageDocument = await messageSchema.aggregate([
            {
                $match: {
                    "guildId": {
                        $in: clientGuilds
                    },
                    $or: [
                        {"channelId": {$exists: false}},
                        {"channelId": "0"}
                    ]
                }
            },
        ]).exec();

        let guildCache = {};
        let averageTimePerMessage = 0;

        let messageCount    = messageDocument.length; // Amt. messages that are left to finish
        let totalMessages   = messageDocument.length; // Total amt. of messages (unchanged)

        let missingMessages = 0; // Amt. messages that haven't been processed
        let filledMessages  = 0; // Amt. messages that have been processed

        let channelMessage = await interaction.channel.send({ embeds: [ new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("⏳ Finding channels...")
                .setDescription("Adding channels to " + messageDocument.length + " messages.")
                .setFooter({ text: "ETA: Unknown | Avg.: Unknown | To update: 0" })
            ]
        });

        // TO-DO: More optimizations
        // - Store the Channels in cache so we don't have to constantly get them
        // - Order the messageDocument by guild ID
        // - Delete any messages that we can't find a channel for (optional)
        let updates = []; // Array to hold bulk update operations
        let lastUpdate = 0; // How many updates were before the current one
        let fetchPromises = []; // Array to hold fetch promises for parallel execution
    
        for (let message of messageDocument) {
            let guild = guildCache[message.guildId] || interaction.client.guilds.cache.get(message.guildId);
            if (!guild) continue;
            if (!guildCache[message.guildId]) guildCache[message.guildId] = guild; // Save guild data in cache
            let messageStartTime = Date.now();
    
            for (let channel of guild.channels.cache.values()) {
                if (channel.type != 0) continue; // Only Text Channels
    
                fetchPromises.push(channel.messages.fetch(message.messageId).then(fetchedMessage => {
                    updates.push({
                        updateOne: {
                            filter: { messageId: message.messageId },
                            update: { $set: { channelId: channel.id } }
                        }
                    });

                    filledMessages++;
                    console.log("(".green + messageCount + "/".green + totalMessages + ") ".green + "Updating message from ".gray + fetchedMessage.author.username.green + " in channel ".gray + channel.name.green);
                }).catch(error => {
                    // Discord errors
                }));
    
                if (fetchPromises.length >= 100) {
                    await Promise.all(fetchPromises);
                    fetchPromises = [];
                }
            }

            await Promise.all(fetchPromises);
            messageCount--;
            
            if (updates.length > lastUpdate) {
                // New message found (save this to update later!)
                lastUpdate++;

                // Calculate average time per message and estimate remaining time
                let elapsedTime = Date.now() - messageStartTime;
                let footerText;

                if (filledMessages > 0) {
                    averageTimePerMessage = ((averageTimePerMessage * (filledMessages - 1)) + elapsedTime) / filledMessages;
                    let estimatedTimeRemaining = Math.round(averageTimePerMessage * (totalMessages - filledMessages) / 1000);
                    let formattedTime = await Formatting.formatTime(estimatedTimeRemaining);
                    footerText = `ETA: ${formattedTime}s | Avg.: ${Math.round(averageTimePerMessage / 1000)}s | To update: ${updates.length}`;
                }

                if (messageCount == 0) continue;
                
                try {
                    await channelMessage.edit({ embeds: [ new EmbedBuilder()
                            .setColor("Yellow")
                            .setTitle("⏳ Finding channels...")
                            .setDescription("Adding channels to " + messageCount + " messages.")
                            .setFooter({ text: footerText || "ETA: Unknown | Avg.: Unknown | To update: 0" })
                        ]
                    });
                } catch (e) {
                    // More than 15 mins. passed
                    console.log("⏳ Error when updating embed: ".red + e);
                }
            } else {
                // No new messages found
                // (maybe we should delete these messages, anyways)
                missingMessages++;
            }
        }

        // Update remaining messages
        await messageSchema.bulkWrite(updates);

        
        await channelMessage.edit({ embeds: [ new EmbedBuilder()
            .setColor("Green")
            .setTitle("🕵️ Channels found!")
            .setDescription("We added a matching channel to " + filledMessages + " messages _(and found " + missingMessages + " messages without a channel that Reto doesn't have access to.)_")
        ]});
    }
}

module.exports = new Debug();

