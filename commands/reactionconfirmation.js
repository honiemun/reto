const { CommandType } = require("wokcommands");
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");

const Personalisation = require("../classes/personalisation");

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

	type: CommandType.SLASH,
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