// Dependencies
const { ApplicationCommandType } = require("discord.js");

// Classes
const Chain = require("../../classes/chain");

module.exports = {
    commandName: 'Add to chain',
    type: ApplicationCommandType.Message,

	callback: async ({ client, interaction }) => {
        await Chain.sendChainConfirmationMessage(interaction);
	},
}