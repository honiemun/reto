const News = require('../../classes/news');

module.exports = async (oldMessage, newMessage, interaction) => {
    await News.updateNews(interaction, newMessage);
};