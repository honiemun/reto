// Dependencies
const { ButtonStyle, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// Schemas
const messageSchema = require('../schemas/message');
const selectedMessageSchema = require('../schemas/selectedMessage');

// Classes
const Pin = require('../classes/pin');

class Chain {

    constructor() {
        if (Chain._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Chain._instance = this;
    }
    
    async sendChainConfirmationMessage(interaction) {
        const selectedMessageDocument = await selectedMessageSchema.findOne({
            userId: interaction.user.id
        }).exec();

        if (!selectedMessageDocument) return interaction.reply({ content: `You have not selected a message.`, ephemeral: true });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Add to chain')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('add'),
                new ButtonBuilder()
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('cancel')       
            );   
                
        interaction.channel.messages.fetch(selectedMessageDocument.messageId).then(async (selectedMessage) => {
            
            if (interaction.targetMessage.createdTimestamp > selectedMessage.createdTimestamp) return interaction.reply({ content: `You can't add a message that's more recent than the selected message to a chain!`, ephemeral: true });

            const embed = await Pin.generateMessageEmbed(selectedMessage, interaction.targetMessage);
    
            const confirmationMessage = await interaction.reply({
                content: `💬 Do you want to add this message to the chain?\n** **`,
                embeds: embed,
                components: [row],
                ephemeral: true
            });

            await this.createChainButtonCollector(interaction, selectedMessage, confirmationMessage);
        });
    }

    async createChainButtonCollector(interaction, selectedMessage, confirmationMessage) {
        // Collector
        const filter = (i) => i.user.id === interaction.user.id;
        const time = 1000 * 60 * 5;
        const collector = confirmationMessage.createMessageComponentCollector({ filter, max: 1, time });

        // Handle collections
        collector.on('collect', async (newInt) => {

            if (!newInt) return;
            await newInt.deferUpdate();
            
            switch (newInt.customId) {
                case 'add':
                    return this.startChainCreation(interaction, selectedMessage);
                case 'cancel':
                    return this.cancelChainCreation(confirmationMessage);
                default:
                    return this.cancelChainCreation(confirmationMessage);
            }
        });

        // On collector end, remove all buttons
        collector.on('end', (collected, reason) => {
            if (reason == "time") {
                interaction.editReply({ components: [] });
            }
        });
    }
    async startChainCreation (interaction, selectedMessage) {
        await this.addMessageToChain(interaction.targetMessage, selectedMessage);

        // Update Pin (if necessary)
        await Pin.pinMessageToChannel(selectedMessage, false, selectedMessage.client, true, false, true);

        // Send confirmation
        interaction.editReply({ content: `✅ Message added to the chain!`, embeds: [], components: [] });
    }
    
    async addMessageToChain(chainMessage, originalMessage) {
        // Create a Message
        const storedChainMessage = await messageSchema.findOneAndUpdate(
			{ messageId: chainMessage.id },
			{
				$set: {
                    'userId': chainMessage.author.id,
                    'guildId': chainMessage.guildId,
                    'channelId': chainMessage.channel.id,
                },
			},
			{ upsert: true, new: true }
		).exec();

        const storedOriginalMessage = await messageSchema.findOneAndUpdate(
            { messageId: originalMessage.id },
            { $addToSet: {
                'chain': { "$each": [storedChainMessage._id] } // Don't repeat IDs
            }},
            { upsert: true, new: true }
        ).exec();

        return storedOriginalMessage;
    }

    async cancelChainCreation (confirmationMessage) {
        return confirmationMessage.delete();
    }
}

module.exports = new Chain();

