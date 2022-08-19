import mongoose from "mongoose";

/*
USER:
Keeps track of users, their current Karma scores,
and other miscellaneous per-user settings.
*/

const messageSchema = new mongoose.Schema({

	// The message's id.
	messageId: {
		type: Number,
		required: true
	},

	// The user (author)'s id.
	userId: {
		type: Number,
		required: true
	},

	// The guild's id.
	guildId: {
		type: Number,
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