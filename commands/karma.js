const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

// Classes
const GuildKarma = require("../classes/guildKarma");

module.exports = {
	category: 'Personalisation',
	description: 'Manages the look of this server\'s Karma.',

	type: CommandType.SLASH,
	guildOnly: false,

	options: [
        {
            name: "emoji",
            description: "Modifies the emoji used to represent Karma on this server.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "set",
                    description: "Sets the emoji used to represent Karma on this server.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {

                            name: "emoji",
                            description: "The emoji to set this server's local karma to.",
                            required: true,
                            type: ApplicationCommandOptionType.String

                        }
                    ]
                },
                {
                    name: "default",
                    description: "Sets the karma emoji to default.",
                    type: ApplicationCommandOptionType.Subcommand,
                }
            ]
        },
        {
            name: "name",
            description: "Modifies the name of this server's Karma.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "set",
                    description: "Sets the name used to represent Karma on this server.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {

                            name: "name",
                            description: "The name to set this server's local karma to.",
                            required: true,
                            type: ApplicationCommandOptionType.String

                        }
                    ]
                },
                {
                    name: "default",
                    description: "Sets the karma name to default.",
                    type: ApplicationCommandOptionType.Subcommand,
                }
            ]
        }
	],

	slash: 'both',
    testOnly: true,
	guildOnly: true,
    
	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommandGroup();
        const cmd = interaction.options.getSubcommand();
        
        switch (cmdGroup) {
            case "emoji":
                await GuildKarma.updateGuildKarmaEmoji(interaction, member, cmd)
                break;
            case "name":
                await GuildKarma.updateGuildKarmaName(interaction, member, cmd)
                break;
        }
	}
}
