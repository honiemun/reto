const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

// Classes
const Port = require("../../classes/port");

module.exports = {
	category: 'Personalisation',
	description: 'Allows bot owners to import data. For internal use only.',

	type: CommandType.SLASH,
	guildOnly: false,
	ownerOnly: true,

	options: [
        {
            name: "legacy",
            description: "Import data from previous, v1 versions of Reto.",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
				{
					name: "table",
					description: "What tables to import? Will import all if not set.",
					required: false,
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Guilds and Reactables",
							value: "guilds"
						},
						{
							name: "Users and Members",
							value: "users"
						},
						{
							name: "Messages",
							value: "messages"
						},
					]
				}
            ]
        }
	],
    
	callback: async ({ interaction }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommand();
        
        switch (cmdGroup) {
            case "legacy":
                Port.legacyImport(interaction);
        }
	}
}
