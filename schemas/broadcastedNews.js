const { mongoose, Schema } = require("mongoose");

/*
BROADCASTED NEWS:
The individual news articles published on each server.
Used to edit or delete articles after they've been published.
*/

const broadcastedNewsSchema = new mongoose.Schema({

    // The news article this broadcast is assigned to.
    newsId: {
		type: Schema.Types.ObjectId,
		required: true
    },

	// The message ID from this news broadcast.
    messageId: {
        type: String,
        required: true
    },

	// The channel ID the message was sent on.
    channelId: {
        type: String,
        required: true
    },

    // The guild ID the message was sent on.
    guildId: {
        type: String,
        required: true
    }
    
});

module.exports = mongoose.model("broadcastedNews", broadcastedNewsSchema);