const { CommandType } = require("wokcommands");
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

// Classes
const Autocomplete = require("../../classes/autocomplete");
const Reactable = require("../../classes/reactable");
const ReactableChecks = require("../../classes/reactableChecks");
const ReactableActions = require("../../classes/reactableActions");

// Schemas

module.exports = {
	category: 'Personalisation',
	description: 'Customize your server\'s Reactables.',

	type: CommandType.SLASH,
	guildOnly: true,
    testOnly: true,

    permissions: [
		PermissionFlagsBits.ManageGuildExpressions
	],

	options: [
        {
            name: "create",
            description: "Create a new Reactable.",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "name",
                    description: "The name of the new Reactable.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "emoji",
                    description: "The emoji for this Reactable.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        },
        {
            name: "delete",
            description: "Delete a Reactable.",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "reactable",
                    description: "The reactable to delete.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                }
            ]
        },
        {
            name: "checks",
            description: "Manage Reactable checks.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "view",
                    description: "View all checks for a Reactable.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "reactable",
                            description: "The reactable to view checks for.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        }
                    ]
                },
                {
                    name: "set",
                    description: "Edit a Reactable's checks.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "reactable",
                            description: "The reactable to edit.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        }
                    ]
                }
            ]
        },
        {
            name: "actions",
            description: "Manage Reactable actions.",
            type: ApplicationCommandOptionType.SubcommandGroup,

            options: [
                {
                    name: "view",
                    description: "View all actions for a Reactable.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "reactable",
                            description: "The reactable to view actions for.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        }
                    ]
                },
                {
                    name: "set",
                    description: "Edit a Reactable's actions.",
                    type: ApplicationCommandOptionType.Subcommand,

                    options: [
                        {
                            name: "reactable",
                            description: "The reactable to edit.",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true,
                        }
                    ]
                }
            ]
        },
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
        // Autocompleting the emoji to remove, we need to return the emojis currently in the Reactable as options
        if (argument === "emoji" && interaction.options.getSubcommand() === "remove") {
            const reactableName = interaction.options.getString("reactable");
            const reactable = await Autocomplete.autocompleteValidate("reactable", {guildId: interaction.guild.id}, reactableName, interaction);
            
            if (!reactable || !reactable.emojiIds || reactable.emojiIds.length === 0) {
                return [];
            }

            // Extract emoji name from ID and return as {name, value}
            return reactable.emojiIds.map(emojiId => {
                const emojiMatch = emojiId.match(/:(\w+):/);
                const emojiName = emojiMatch ? emojiMatch[1] : emojiId;
                return {
                    name: `:${emojiName}:`,
                    value: emojiId
                };
            });
        }

        // Otherwise autocomplete the reactable
        return await Autocomplete.autocomplete("reactable", {guildId: interaction.guild.id});
    },
    
	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommandGroup();
        const cmd = interaction.options.getSubcommand();

        // Top-level subcommands
        if (!cmdGroup) {
            switch (cmd) {
                case "create":
                    await Reactable.createReactable(interaction);
                    break;
                case "delete":
                    await Reactable.deleteReactable(interaction);
                    break;
                default:
                    break;
            }
            return;
        }

        const reactable = await Autocomplete.autocompleteValidate("reactable", {guildId: interaction.guild.id}, interaction.options.getString("reactable"), interaction);
        if (!reactable) return;
        
        switch (cmdGroup) {
            case "checks":
                switch (cmd) {
                    case "view":
                        await ReactableChecks.viewChecks(interaction, reactable);
                        break;
                    case "set":
                        await ReactableChecks.setChecks(interaction, reactable);
                        break;
                }
                break;

            case "actions":
                switch (cmd) {
                    case "view":
                        await ReactableActions.viewActions(interaction, reactable);
                        break;
                    case "set":
                        await ReactableActions.setActions(interaction, reactable);
                        break;
                }
                break;

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
