// Dependencies
const { ButtonStyle, ActionRowBuilder, ButtonBuilder, PermissionsBitField } = require("discord.js");

// Schemas
const messageSchema = require('../schemas/message');
const selectedMessageSchema = require('../schemas/selectedMessage');
const reactableSchema = require("../schemas/reactable");

// Classes
const Pin = require('../classes/pin');
const Reaction = require('../classes/reaction');

class Chain {

    constructor() {
        if (Chain._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Chain._instance = this;
    }
    
    async sendChainConfirmationMessage(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const selectedMessageDocument = await selectedMessageSchema.findOne({
            userId: interaction.user.id
        }).exec();

        
        if (!selectedMessageDocument) return interaction.editReply({ content: `You have not selected a message.`, ephemeral: true });
        if (selectedMessageDocument.messageId == interaction.targetMessage.id) return interaction.editReply({ content: `You can't add the same message to itself!`, ephemeral: true });
        
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
            
            if (interaction.targetMessage.createdTimestamp > selectedMessage.createdTimestamp) return interaction.editReply({ content: `You can't add a message that's more recent than the selected message to a chain!`, ephemeral: true });
            if (interaction.targetMessage.channelId != selectedMessage.channel.id) return interaction.editReply({ content: `The message you're adding to this chain has to be from the same channel as the original message.`, ephemeral: true });

            // Check if member can use Chain Messages (message owner, server admin, or allowed to use any Pin)
            const canReact = await this.checkIfMemberCanPin(interaction);
            const isMessageAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
            const isMessageAuthor = interaction.targetMessage.author.id == interaction.user.id;
            if (!canReact && !isMessageAdmin && !isMessageAuthor) return interaction.editReply({ content: `You can't add a message to this chain!\nOnly the owner of the original message, members with the Manage Messages permission or those who can use role-locked pins can add messages to a chain.`, ephemeral: true });
            
            const embed = await Pin.generateMessageEmbed(selectedMessage, interaction.targetMessage);
    
            const confirmationMessage = await interaction.editReply({
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
                    return this.cancelChainCreation(interaction);
                default:
                    return this.cancelChainCreation(interaction);
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

    async checkIfMemberCanPin(interaction) {
        const guildReactables = await reactableSchema.find({
            guildId: interaction.guild.id
        })
        .exec();

        let roleLockedReactables = [];

        for (const reactable of guildReactables) {
            if (reactable.sendsToChannel && reactable.lockedBehindRoles) {
                roleLockedReactables.push(reactable.lockedBehindRoles);
                const canReact = await Reaction.checkMemberCanReact(interaction.member, reactable);
                if (canReact) return true;
            }
        }

        if (!roleLockedReactables.length) return true;
        else return false;
    }

    async cancelChainCreation (interaction) {
        return interaction.deleteReply();
    }
}

module.exports = new Chain();

