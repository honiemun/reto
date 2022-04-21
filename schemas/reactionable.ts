import mongoose from "mongoose";

/*
REACTIONABLE:
Emoji that Reto stores and is actively looking for in chat.
These perform different functions, depending on the values set below.

In Reto Legacy, reactionables were only :plus:, :minus: and :10:.
This new system aims to de-hardcode reactionables, and make them customisable
on a guild by guild basis.
*/

const reactionableSchema = new mongoose.Schema({

	// The ID of the guild this reactionable is used on.
	guildId: {
		type: Number,
		required: true
	},

	// The ID of the emoji this reactionable belongs to, if it's a custom emoji.
	emojiId: {
		type: String,
		required: true,
	},

	// The ID of the channel this reactionable sends a post to.
	sendsToChannel: {
		type: Number,
		required: false
	},

	// The amount of karma this reactionable awards. Can be positive or negative.
	karmaAwarded: {
		type: Number,
		required: false,
		default: 0
	},

	// An array of the roles you need to use this reactionable.
	lockedBehindRoles: {
		type: Array,
		required: false,
	},

	// Determines if this reactionable awards Karma on a global karma basis.
	globalKarma: {
		type: Boolean,
		required: false,
		default: false
	}
});

export default mongoose.model("reactionable", reactionableSchema);