// Dependencies
const { ApplicationCommandType } = require("discord.js");

// Schemas
const selectedMessageSchema = require('../../schemas/selectedMessage');

module.exports = {
    commandName: 'Select this message',
    type: ApplicationCommandType.Message,

    testOnly: true,

	callback: async ({ client, interaction }) => {
        await selectedMessageSchema.findOneAndUpdate(
            { userId: interaction.targetMessage.id, messageId: interaction.user.id },
            { },
            { upsert: true }
        ).exec();

        interaction.reply({content: 'This message has been selected.', ephemeral: true});
	},
}