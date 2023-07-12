const { EmbedBuilder } = require("discord.js");
const I18n = require("../classes/i18n");
const ApplicationCommandOptionType = require("discord.js");
const Personalisation = require("../classes/personalisation");
const Embed = require("../classes/embed");

module.exports = {
	category: 'Personalisation',
	description: 'Change the Karma emoji used on this server.',

	options: [
		{
			name: "emoji",
			description: "The emoji to set this server's local karma to.",
			required: true,
			type: ApplicationCommandOptionType.String
		}
	],

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: true,

	callback: async ({ member, instance, interaction }) => {
		await interaction.deferReply();
		const isEmoji = (str) => str.match(/((?<!\\)<:[^:]+:(\d+)>)|\p{Emoji_Presentation}|\p{Extended_Pictographic}/gmu);

		if (!isEmoji(interaction.options.getString("emoji"))) {
			Embed.createErrorEmbed("`" + interaction.options.getString("emoji") + "` is not an emoji!").then(async function (errorEmbed) {
				await interaction.followUp({ embeds: [ errorEmbed ], ephemeral: true })
			})
			return;
		}

		if (isEmoji(interaction.options.getString("emoji")).length > 1) {
			Embed.createErrorEmbed("You can only set one emoji at a time!").then(async function (errorEmbed) {
				await interaction.followUp({ embeds: [ errorEmbed ], ephemeral: true })
			})
			return;
		}

		Personalisation.changeGuildKarmaEmoji(member.guild.id, interaction.options.getString("emoji"))
		
        await interaction.editReply({ embeds: [ new EmbedBuilder()
            .setColor("Green")
            .setTitle("✔️ Server Karma changed!")
            .setDescription("The new emoji for this server's karma is " + interaction.options.getString("emoji") + ".")
		] });
	},
}