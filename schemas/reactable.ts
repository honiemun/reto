import mongoose from "mongoose";

/*
REACTABLE:
Emoji that Reto stores and is actively looking for in chat.
These perform different functions, depending on the values set below.

In Reto Legacy, reactables were only :plus:, :minus: and :10:.
This new system aims to de-hardcode reactables, and make them customisable
on a guild by guild basis.
*/

const reactableSchema = new mongoose.Schema({

	// The ID of the guild this reactable is used on.
	guildId: {
		type: String,
		required: true
	},

	// The ID of the emoji this reactable belongs to.
	emojiIds: {
		type: Array,
		required: true,
	},

	// The ID of the channel this reactable sends a post to.
	sendsToChannel: {
		type: String,
		required: false
	},

	// The amount of karma this reactable awards. Can be positive or negative.
	karmaAwarded: {
		type: Number,
		required: false,
		default: 0
	},

	// An array of the roles you need to use this reactable.
	lockedBehindRoles: {
		type: Array,
		required: false,
	},

	// Determines if this reactable awards Karma on a global karma basis.
	globalKarma: {
		type: Boolean,
		required: false,
		default: false
	},

	// The message this reactable sends to the channel it's been reacted on,
	// if the Guild has messageConfirmation on.
	messageConfirmation: {
		type: String,
		required: false
	}
});

export default mongoose.model("reactable", reactableSchema);