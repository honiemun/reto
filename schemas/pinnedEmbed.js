const { mongoose, Schema } = require("mongoose");

/*
PINNED EMBED:
Keeps track of the messages Reto generates
in Pin channels, to trace back and update.
*/

const pinnedEmbedSchema = new mongoose.Schema({

	// The pinned embed's id.
	pinnedEmbedId: {
		type: String,
		required: true
	},

    // The pinned embed's channel ID.
    channelId: {
		type: String,
		required: true
    },

    // The message this pinned embed references.
    message: {
        type: Schema.Types.ObjectId,
        ref: "message"
    }
});

module.exports = mongoose.model("pinnedEmbed", pinnedEmbedSchema);