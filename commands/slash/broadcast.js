const { CommandType } = require("wokcommands");
const { ApplicationCommandOptionType } = require("discord.js");

// Classes
const News = require("../../classes/news");

module.exports = {
	category: 'News',
	description: 'Publish a news article on subscribed Reactable Channels.',

	type: CommandType.SLASH,
	guildOnly: true,
    testOnly: true,
    ownerOnly: true,

	options: [
        {
            name: "title",
            description: "The article's title.",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "message",
            description: "The ID of the message you'd like to convert into a news article.",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "url",
            description: "An URL displayed as a button on the news article.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "url-title",
            description: "The title of the URL displayed as a button on the news article. \"Learn more\" by default.",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "override",
            description: "Message is broadcasted to every server, regardless of sign-up to Newsletter. Use with caution!",
            type: ApplicationCommandOptionType.Boolean,
            required: false
        }
	],
    
	callback: async ({ interaction, client }) => {
		await interaction.deferReply();

        await News.broadcast(interaction, client);
	}
}
