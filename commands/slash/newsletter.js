const { CommandType } = require("wokcommands");

// Classes
const News = require("../../classes/news");

// Schemas

module.exports = {
	category: 'News',
	description: 'Read the latest news on Reto!',

	type: CommandType.SLASH,
	guildOnly: false,
    
	callback: async ({ interaction, client }) => {
		await interaction.deferReply();
        await News.showScrollableNews(interaction, client);
	}
}
