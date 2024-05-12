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

    async checkIfPreviouslyReacted(message, reactingUser, reactable, globalReactable = false) {
        let query = {
            messageId: message.id,
            userId: reactingUser.id,
        }

        if (reactable) query.reactableId = reactable._id;
        if (globalReactable) query.globalReacion = true;

        const reactions = await reactionSchema.find(query).exec();

        return reactions.length;
    }

}

module.exports = new ReactionCheck();