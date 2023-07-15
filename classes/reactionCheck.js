// Schemas
const reactionSchema = require('../schemas/reaction');

class ReactionCheck {

    // The only purpose of this class is to solve a circular dependency.
    // It might be for the better to refactor this in the future.
    
    constructor() {
        if (ReactionCheck._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        ReactionCheck._instance = this;
    }

    async checkIfPreviouslyReacted(message, reactingUser, reactable) {
        const reactions = await reactionSchema.find({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).exec();

        return reactions.length;
    }

}

module.exports = new ReactionCheck();