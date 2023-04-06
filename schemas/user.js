const mongoose = require("mongoose");

/*
USER:
Keeps track of users, their current Karma scores,
and other miscellaneous per-user settings.
*/

const userSchema = new mongoose.Schema({

	// The user's id.
	userId: {
		type: String,
		required: true
	},

	// The user's global karma count.
	// This is shared across servers, and can be incremented
	// or decreased by Reactables with the globalKarma flag set.
	globalKarma: {
		type: Number,
		required: true,
		default: 0
	},

	// Whether the user wants their messages to be stored.
	canStoreMessages: {
		type: Boolean,
		required: true,
		default: true
	}
});

module.exports = mongoose.model("user", userSchema);