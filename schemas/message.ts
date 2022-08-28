import mongoose from "mongoose";
import Schema from "mongoose";

/*
MESSAGE:
Keeps track of the messages an User sends
that a Reactable has been used on.
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
	},

	// The pinned embeds this message is featured on.
	pinnedEmbeds: [{
		type: Schema.Types.ObjectId,
		ref: "pinnedEmbed"
	}]
});

export default mongoose.model("message", messageSchema);