const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

// Classes
const Reactable = require("../classes/reactable");

module.exports = {
	category: 'Personalisation',
	description: 'Manages whether Reactables can pin messages.',

	type: CommandType.SLASH,
	guildOnly: true,

	options: [
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
            case "channel":
                await Reactable.updateReactablePinChannel(interaction, member, cmd)
                break;
                
            default:
                switch (cmd) {
                    case "amount":
                        await Reactable.updateReactablePinAmount(interaction, member)
                        break;
                }
                break;
        }
	}
}
