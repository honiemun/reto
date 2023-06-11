const Reaction = require('../../classes/reactiontest');

module.exports = async (reaction, user) => {
    await Reaction.messageReactionHandler(reaction, user, false);
};