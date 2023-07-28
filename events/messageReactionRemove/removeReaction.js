const Reaction = require('../../classes/reaction');

module.exports = async (reaction, user) => {
    await Reaction.messageReactionHandler(reaction, user, false);
};