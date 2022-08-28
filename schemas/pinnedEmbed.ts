import mongoose from "mongoose";
import Schema from "mongoose";

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

export default mongoose.model("pinnedEmbed", pinnedEmbedSchema);