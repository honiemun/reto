const Personalisation = require("../classes/personalisation");
const { EmbedBuilder } = require("discord.js");
const ApplicationCommandOptionType = require("discord.js");

module.exports = {
	category: 'Personalisation',
	description: 'Sets whether to send an embed or react to a message after it\'s been interacted with.',

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

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: false,

	callback: ({ interaction, member }) => {
		Personalisation.changeMessageReplyMode(member.guild.id, interaction.options.getString("mode") == "embed" ? true : false);

        return interaction.reply({embeds: [ new EmbedBuilder()
            .setColor("Green")
            .setTitle("✔️ Reaction confirmations are updated!")
            .setDescription("This server will now use **" + interaction.options.getString("mode") + "s** to reply to reacted messages.")
			.setFooter({ text: "You can change how the embeds look with /reactionconfirmationembed!" })
		] });
	},
}