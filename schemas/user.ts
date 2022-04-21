import mongoose from "mongoose";

/*
USER:
Keeps track of users, their current Karma scores,
and other miscellaneous per-user settings.
*/

const userSchema = new mongoose.Schema({

	// The user's id.
	userId: {
		type: Number,
		required: true
	},

	// The user's global karma count.
	// This is shared across servers, and can be incremented
	// or decreased by Reactionables with the globalKarma flag set.
	globalKarma: {
		type: Number,
		required: true,
		default: 0
	}
});

export default mongoose.model("user", userSchema);