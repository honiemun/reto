const { CommandType } = require("wokcommands");
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

// Classes
const Debug = require("../../classes/debug");

module.exports = {
	category: 'Debug',
	description: 'General debugging tools.',

	type: CommandType.SLASH,
	guildOnly: true,
    testOnly: true,
    ownerOnly: true,

	options: [
        {
            name: "channels-in-messages",
            description: "Iterate through every message we've got access to, find the Channel ID, and save it.",
            type: ApplicationCommandOptionType.Subcommand
        },
	],
    
	callback: async ({ interaction }) => {
		interaction.deferReply({ fetchReply: true });

        const cmd = interaction.options.getSubcommand();
        
        switch (cmd) {
            case "channels-in-messages":
                await Debug.fillChannelsInMessages(interaction);
                break;
        }
	}
}
