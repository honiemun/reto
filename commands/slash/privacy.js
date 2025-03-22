const { CommandType } = require("wokcommands");
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

// Classes
const Privacy = require("../../classes/privacy");

module.exports = {
	category: 'Configuration',
	description: 'Settings related to how Reto uses your private data.',

	type: CommandType.SLASH,
	guildOnly: true,

	options: [
        {
            name: "personal",
            description: "Manage the data Reto stores about you.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "export",
                    description: "Get a .JSON file of the private data Reto stores about you.",
                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: "delete",
                    description: "Delete all of your messages and personal data off of Reto's database.",
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "discovery",
                    description: "Enable or disable whether you want your messages to be seen in /discover.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "allow",
                            description: "Allow Reto to see your messages in /discover.",
                            required: true,
                            type: ApplicationCommandOptionType.Boolean
                        }
                    ]
                },
                /*
                {
                    name: "store",
                    description: "Enable or disable whether Reto can store your messages. Disabling this will break some bot functionality!",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "allow",
                            description: "Allow Reto to store your messages.",
                            required: true,
                            type: ApplicationCommandOptionType.Boolean
                        }
                    ]
                }
                */
            ]
        },
        {
            name: "server",
            description: "Manage the data Reto stores about your server.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "discovery",
                    description: "Enable or disable whether you want your server's messages to be seen in /discover.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "allow",
                            description: "Allow Reto to show your server's messages in /discover.",
                            required: true,
                            type: ApplicationCommandOptionType.Boolean
                        }
                    ]
                }
                /*
                {
                    name: "export",
                    description: "Get a .JSON file of the private data Reto stores on your server.",
                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: "delete",
                    description: "Delete all of your messages and personal data off of Reto's database.",
                    type: ApplicationCommandOptionType.Subcommand
                }
                */
            ]
        }
	],
    
	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommandGroup();
        const cmd = interaction.options.getSubcommand();
        
        switch (cmdGroup) {
            case "personal":
                switch (cmd) {
                    case "export":
                        await Privacy.exportUserData(interaction);
                        break;
                    case "delete":
                        await Privacy.confirmDeletionOfUserData(interaction);
                        break;
                    case "discovery":
                        await Privacy.toggleDiscovery(interaction, false);
                        break;
                }
                break;
            case "server":
                switch (cmd) {
                    case "discovery":
                        await Privacy.toggleDiscovery(interaction, true);
                        break;
                }
                break;
        }
	}
}
