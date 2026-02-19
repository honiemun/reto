const { CommandType } = require("wokcommands");
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

// Classes
const Pin = require("../../classes/pin");
const Reactable = require("../../classes/reactable");

module.exports = {
    // TO-DO: Consider if this needs to be ported to Reactable or renamed.
    // (/reactable pinnablechannel)?
	category: 'Personalisation',
	description: 'Manages whether Reactables can pin messages.',

	type: CommandType.SLASH,
	guildOnly: true,

    permissions: [
        PermissionFlagsBits.ManageChannels |
		PermissionFlagsBits.ManageGuildExpressions
	],

	options: [
        {
            name: "threshold",
            description: "Set rules to make Karma totals pin a message!",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "list",
                    description: "See the Pin Thresholds currently in use in your server.",
                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: "edit",
                    description: "Edit or create Pin Thresholds for a channel.",
                    type: ApplicationCommandOptionType.Subcommand,
                    
                    options: [
                        {
                            name: "channel",
                            description: "The channel that the reacted messages will be sent to.",
                            required: true,
                            type: ApplicationCommandOptionType.Channel
                        },
                        {
                            name: "karma",
                            description: "The threshold of Karma needed to pin a message.",
                            required: true,
                            type: ApplicationCommandOptionType.Number
                        }
                    ]
                },
                {
                    name: "delete",
                    description: "Remove previously set Pin Thresholds off your server.",
                    type: ApplicationCommandOptionType.Subcommand,
                    
                    options: [
                        {
                            name: "channel",
                            description: "The channel that you want to delete the Pin Thresholds from.",
                            required: true,
                            type: ApplicationCommandOptionType.Channel
                        }
                    ]
                }
            ]
        }
	],
    
	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommandGroup();
        const cmd = interaction.options.getSubcommand();
        
        switch (cmdGroup) {
            case "threshold":
                await Pin.pinThresholdSettings(interaction, member, cmd);
                break;
        }
	}
}
