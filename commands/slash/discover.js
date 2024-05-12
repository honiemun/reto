const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

// Classes
const Discover = require("../../classes/discover");

module.exports = {
	category: 'Discover',
	description: 'Explore the best messages throughout Reto!',

	type: CommandType.SLASH,
	guildOnly: true,
    testOnly: false,

	options: [
        {
            name: "server",
            description: "Explore messages sent on this server!",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                {
                    name: "sort",
                    description: "Show messages in a specific order.",
					required: false,
					type: ApplicationCommandOptionType.String,
					choices: [
                        /*
						{
							name: "For You (default)",
							value: "algorithm"
						},
                        */
						{
							name: "Random (default)",
							value: "random"
						},
						{
							name: "By Karma",
							value: "karma"
						},
						{
							name: "Newest",
							value: "reverse-chronological"
						},
                        {
                            name: "Oldest",
                            value: "chronological"
                        }
					]
                },
                {
                    name: "member",
                    description: "Show messages from a specific member.",
                    required: false,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: "skip-react",
                    description: "Whether to skip to the next message after reacting to it. False by default.",
                    required: false,
                    type: ApplicationCommandOptionType.Boolean
                },
                /*
                {
                    name: "censor",
                    description: "Hide (or show) certain types of messages.",
					required: false,
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Only SFW (default)",
							value: "sfw"
						},
						{
							name: "SFW and NSFW",
							value: "all"
						},
						{
							name: "Only NSFW",
							value: "nsfw"
						}
					]
                },
                {
                    name: "filter",
                    description: "Show messages depending on their contents.",
					required: false,
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Text posts",
							value: "text"
						},
						{
							name: "Media",
							value: "media"
						}
					]
                },
                */
            ],
        },
        /*
        {
            name: "global",
            description: "Sets the amount of reactions needed on a reactable to pin a message. [Reto Gold]",
            type: ApplicationCommandOptionType.Subcommand,

            options: [
                // Add after Open Beta launch
            ]
        }
        */
	],
    
	callback: async ({ interaction, member }) => {
		await interaction.deferReply();
        const cmd = interaction.options.getSubcommand();
        
        switch (cmd) {
            case "server":
                await Discover.loadDiscovery(interaction, member);
                break;
            case "global":
                console.log("You're not supposed to be here.")
                break;
        }
	}
}
