// Dependencies
const { ApplicationCommandType } = require("discord.js");

// Schemas
const selectedMessageSchema = require('../../schemas/selectedMessage');

module.exports = {
    commandName: 'Add to context',
    type: ApplicationCommandType.Message,

    testOnly: true,

	callback: async ({ client, interaction }) => {
        console.log("wow!")
	},
}