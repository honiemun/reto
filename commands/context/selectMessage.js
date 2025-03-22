// Dependencies
const { ApplicationCommandType } = require("discord.js");

// Classes
const SelectMessage = require('../../classes/selectMessage');

module.exports = {
    commandName: 'Select this message',
    type: ApplicationCommandType.Message,

	callback: async ({ client, interaction }) => {
        let message = await SelectMessage.selectMessage(interaction.user, interaction.targetMessage);

        if (!message) return interaction.reply({content: 'There was an error while selecting this message. Please try later.', ephemeral: true});
        interaction.reply({content: 'This message has been selected.', ephemeral: true});
	},
}