// Schemas
const selectedMessageSchema = require('../schemas/selectedMessage');

class SelectMessage {

    constructor() {
        if (SelectMessage._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        SelectMessage._instance = this;
    }

    async selectMessage(user, targetMessage) {
        return await selectedMessageSchema.findOneAndUpdate(
            { userId: user.id },
            { $set: { messageId: targetMessage.id } },
            { upsert: true }
        ).exec();
    }
}

module.exports = new SelectMessage();