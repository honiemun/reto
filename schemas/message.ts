import mongoose from "mongoose";

/*
USER:
Keeps track of users, their current Karma scores,
and other miscellaneous per-user settings.
*/

const messageSchema = new mongoose.Schema({

	// The message's id.
	messageId: {
		type: String,
		required: true
	},

	// The user (author)'s id.
	userId: {
		type: String,
		required: true
	},

	// The guild's id.
	guildId: {
		type: String,
		required: true
	},

	// The message's individual karma.
	karma: {
		type: Number,
		required: true,
		default: 0
	}
});

export default mongoose.model("message", messageSchema);