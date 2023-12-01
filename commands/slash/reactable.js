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
                }
            ]
        }
	],

    autocomplete: async (command, argument, interaction) => {
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
                }

                break;
            
            default:
                break;
        }
	}
}
