const { MessageEmbed } = require("discord.js");
const I18n = require("../classes/i18n");
const ApplicationCommandOptionTypes = require("discord.js");
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
			type: "STRING"
		}
	],

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: true,

	callback: ({ member, instance, interaction }) => {
		const isEmoji = (str) => str.match(/((?<!\\)<:[^:]+:(\d+)>)|\p{Emoji_Presentation}|\p{Extended_Pictographic}/gmu);

		if (!isEmoji(interaction.options.getString("emoji"))) {
			Embed.createErrorEmbed("`" + interaction.options.getString("emoji") + "` is not an emoji!").then(function (errorEmbed) {
				interaction.channel.send({
					embeds: [ errorEmbed ]
				});
			})
			return;
		}
		
        return new MessageEmbed()
            .setColor("GREEN")
            .setTitle("✔️ Server Karma changed!")
            .setDescription("The new emoji for this server's karma is " + interaction.options.getString("emoji") + ".")
	},
}