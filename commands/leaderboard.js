const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

const Ranking = require("../classes/ranking");

module.exports = {
	category: 'Ranking',
	description: 'A ranking of who\'s got the most Karma on this server, or all through Reto!',

	type: CommandType.SLASH,
	guildOnly: true,

	options: [
		{
			name: "server",
			description: "A ranking of everyone's Karma totals on this server.",
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "global",
			description: "A ranking of the top 100 users with the most Karma throughout Reto!",
			type: ApplicationCommandOptionType.Subcommand
		}
	],
	
	callback: async ({ interaction, member, channel, client }) => {
		await interaction.deferReply();

        const cmdGroup = interaction.options.getSubcommand();
        const type = cmdGroup == "server" ? "server" : "global";

        await Ranking.leaderboard(type, interaction, member, channel, client);
	},
}