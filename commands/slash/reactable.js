const { CommandType } = require("wokcommands");
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

// Classes
const Autocomplete = require("../../classes/autocomplete");
const Reactable = require("../../classes/reactable");

// Schemas

module.exports = {
	category: 'Personalisation',
	description: 'Customize your server\'s Reactables.',

	type: CommandType.SLASH,
	guildOnly: true,

    permissions: [
		PermissionFlagsBits.ManageGuildExpressions
	],

	options: [
        {
            name: "emoji",
            description: "Modify a Reactable's emojis.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "default",
                    description: "Set the default emoji out of a given Reactable.",
                    type: ApplicationCommandOptionType.Subcommand,
        
                    options: [
                        {
                            name: "reactable",
                            description: "The reactable that'll get its main Default Emoji set.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        }
                    ]
                },
                {
                    name: "add",
                    description: "Add a new emoji to a Reactable.",
                    type: ApplicationCommandOptionType.Subcommand,
        
                    options: [
                        {
                            name: "reactable",
                            description: "The reactable to add an emoji to.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        },
                        {
                            name: "emoji",
                            description: "The emoji to add to this Reactable. Can be a custom or default emoji.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        }
                    ]
                },
                {
                    name: "remove",
                    description: "Remove an emoji from a Reactable.",
                    type: ApplicationCommandOptionType.Subcommand,
        
                    options: [
                        {
                            name: "reactable",
                            description: "The reactable to remove an emoji from.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        },
                        {
                            name: "emoji",
                            description: "The emoji to remove from this Reactable. Can be a custom or default emoji.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        }
                    ]
                }
            ]
        }
	],

    autocomplete: async (command, argument, interaction) => {
        // autocompleting the emoji to remove, we need to return the emojis currently in the Reactable as options
        if (argument === "emoji" && interaction.options.getSubcommand() === "remove") {
            const reactableName = interaction.options.getString("reactable");
            const reactable = await Autocomplete.autocompleteValidate("reactable", {guildId: interaction.guild.id}, reactableName, interaction);
            
            if (!reactable || !reactable.emojiIds || reactable.emojiIds.length === 0) {
                return [];
            }

            // Return current emojis as autocomplete suggestions
            return reactable.emojiIds.map(emoji => emoji.toString());
        }

        // Otherwise autocomplete the reactable
        return await Autocomplete.autocomplete("reactable", {guildId: interaction.guild.id});
    },
    
	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommandGroup();
        const cmd = interaction.options.getSubcommand();

        const reactable = await Autocomplete.autocompleteValidate("reactable", {guildId: interaction.guild.id}, interaction.options.getString("reactable"), interaction);
        if (!reactable) return;
        
        switch (cmdGroup) {
            case "emoji":

                switch (cmd) {
                    case "default":
                        await Reactable.editDefaultEmoji(interaction, reactable);
                        break;
                    case "add":
                        await Reactable.addEmoji(interaction, reactable);
                        break;
                    case "remove":
                        await Reactable.removeEmoji(interaction, reactable);
                        break;
                }

                break;
            
            default:
                break;
        }
	}
}
