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
        // TO-DO: Check if this should go in Reactable instead,
        // in preparation for Pin Thresholds, which are decoupled from Reactables.
        // /reactable threshold
        {
            name: "amount",
            description: "Sets the amount of reactions needed on a reactable to pin a message. [Reto Gold]",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "amount",
                    description: "The threshold of reactions needed to pin a message.",
                    required: true,
                    type: ApplicationCommandOptionType.Number
                }
            ],
        },
        {
            name: "channel",
            description: "Sets the channel that a reactable will pin a message to.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "set",
                    description: "Sets the channel that a reactable will pin a message to.",
                    type: ApplicationCommandOptionType.Subcommand,
        
                    options: [
                        {
                            name: "channel",
                            description: "The threshold of reactions needed to pin a message.",
                            required: true,
                            type: ApplicationCommandOptionType.Channel
                        }
                    ]
                },
                {
                    name: "disable",
                    description: "Disables pinning messages with a reactable.",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
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
            case "channel":
                await Reactable.updateReactablePinChannel(interaction, member, cmd);
                break;
            case "threshold":
                await Pin.pinThresholdSettings(interaction, member, cmd);
                break;
            default:
                switch (cmd) {
                    case "amount":
                        await Reactable.updateReactablePinAmount(interaction, member);
                        break;
                }
                break;
        }
	}
}
