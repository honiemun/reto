const { CommandType } = require("wokcommands");
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

// Classes
const Debug = require("../../classes/debug");

module.exports = {
	category: 'Debug',
	description: 'Debug tools for Slash Commands.',

	type: CommandType.SLASH,
	guildOnly: true,
    testOnly: true,
    ownerOnly: true,

	options: [
        {
            name: "delete",
            description: "Delete all Slash Commands. Set an optional ID to delete a single Slash Command.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "id",
                    description: "The ID of the Slash Command to delete.",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
	],
    
	callback: async ({ interaction }) => {
		await interaction.deferReply();

        const cmd = interaction.options.getSubcommand();
        
        switch (cmd) {
            case "delete":
                await Debug.deleteCommands(interaction)
                break;
        }
	}
}
