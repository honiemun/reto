const News = require('../../classes/news');

module.exports = async (message, interaction) => {
    await News.deleteNews(interaction, message);
};