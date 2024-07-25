const { CommandType } = require("wokcommands");

// Classes
const News = require("../../classes/news");
const { testOnly } = require("./modifiers");

// Schemas

module.exports = {
	category: 'News',
	description: 'Read the latest news on Reto!',

	type: CommandType.SLASH,
	guildOnly: false,
	testOnly: true,
    
	callback: async ({ interaction, client }) => {
		await interaction.deferReply();
        await News.showScrollableNews(interaction, client);
	}
}
