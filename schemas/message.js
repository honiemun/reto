const { mongoose, Schema } = require("mongoose");

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

	// The channel on which this message was sent on.
	channelId: {
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
	}],

	// Other messages that precede this one, whether it's replies or manually selected context messages.
	chain: [{
		type: Schema.Types.ObjectId,
		ref: "pinnedEmbed"
	}],
	
}, { timestamps: true });

module.exports = mongoose.model("message", messageSchema);