const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

// Classes
const Autocomplete = require("../classes/autocomplete");
const Autoreact = require("../classes/autoreact");

// Schemas
const reactableSchema = require("../schemas/reactable");

module.exports = {
	category: 'Personalisation',
	description: 'Allows Reto to automatically react to messages sent to a channel.',

	type: CommandType.SLASH,
	guildOnly: true,

	options: [
        {
            name: "list",
            description: "See the Autoreact rules currently in use in your server.",
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "edit",
            description: "Edit or create Autoreact rules for a channel.",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "channel",
                    description: "Defines the channel affected by this Autoreact rule.",
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                },
                {
                    name: "reactable",
                    description: "Defines the Reactable affected by this Autoreact rule.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                }
            ]
        },
        {
            name: "delete",
            description: "Remove an Autoreact rule in a channel.",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "channel",
                    description: "Defines the channel affected by this Autoreact rule.",
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                },
                {
                    name: "reactable",
                    description: "Defines the Reactable affected by this Autoreact rule.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                }
            ]
        },
	],

    autocomplete: async (command, argument, interaction) => {
        return await Autocomplete.autocomplete("reactable", {guildId: interaction.guild.id});
    },

	slash: 'both',
    testOnly: true,
	guildOnly: true,
    
	callback: async ({ interaction, member }) => {
		await interaction.deferReply();

        //const cmdGroup = interaction.options.getSubcommandGroup();
        const cmd = interaction.options.getSubcommand();

        let reactable;
        if (cmd != "list") {
            reactable = await Autocomplete.autocompleteValidate("reactable", {guildId: interaction.guild.id}, interaction.options.getString("reactable"), interaction);
            if (!reactable) return;
        }
        
        switch (cmd) {
            case "list":
                await Autoreact.list(interaction);
                break;

            case "edit":
                await Autoreact.contentTypeSelector(interaction, reactable);
                break;
            
            case "delete":
                await Autoreact.delete(interaction, reactable);
                break;
            
            default:
                break;
        }
	}
}
