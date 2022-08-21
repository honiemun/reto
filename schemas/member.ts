
import mongoose from "mongoose";

/*
MEMBER:
Keeps track of an user that is a member of a guild.
*/

const memberSchema = new mongoose.Schema({

	// The guild's ID.
	guildId: {
		type: String,
		required: true
	},

	// The user's ID.
	userId: {
		type: String,
		required: true
	},
	
	// The member's local Karma total.
	karma: {
		type: Number,
		required: true,
		default: 0
	}
});

export default mongoose.model("member", memberSchema);