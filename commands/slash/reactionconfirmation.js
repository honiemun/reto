const { CommandType } = require("wokcommands");
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

// Classes
const ReactionConfirmation = require("../../classes/reactionConfirmation");

module.exports = {
	category: 'Personalisation',
	description: 'Modifies how Reto confirms a reaction was received.',


	options: [
        {
            name: "mode",
            description: "Sets whether to send an embed or react to a message after it's been interacted with.",
            type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "mode",
					description: "The mode that replies are set with.",
					required: true,
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Reaction",
							value: "reaction"
						},
						{
							name: "Embed",
							value: "embed"
						},
					]
				}
			],
        },
        {
            name: "embed",
            description: "Changes how the reaction embed looks whenever someone reacts to a message.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "set",
                    description: "Sets how the reaction embed looks whenever someone reacts to a message.",
                    type: ApplicationCommandOptionType.Subcommand,
        
					options: [
						{
							name: "title",
							description: "The header of the embed.",
							required: true,
							type: ApplicationCommandOptionType.String
						},
						{
							name: "description",
							description: "The contents of the embed.",
							required: true,
							type: ApplicationCommandOptionType.String
						}
					]
                },
                {
                    name: "default",
                    description: "Restores the original reaction embed.",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        }
	],

	type: CommandType.SLASH,
	guildOnly: true,

    permissions: [
		PermissionFlagsBits.ManageGuildExpressions
	],

	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommandGroup();
        const cmd = interaction.options.getSubcommand();
        
        switch (cmdGroup) {
            case "embed":
                await ReactionConfirmation.updateReactionConfirmationEmbed(interaction, member, cmd)
                break;
                
            default:
                switch (cmd) {
                    case "mode":
                        await ReactionConfirmation.updateReactionConfirmationMode(interaction, member)
                        break;
                }
                break;
        }
	},
}