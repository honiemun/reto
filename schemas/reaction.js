const { mongoose, Schema } = require("mongoose");

/*
REACTION:
Keeps track of the reactions that an user makes on a message.
Different from REACTABLES: the first is the reactions an user can make,
this one is the reactions that have been sent.
*/

const reactionSchema = new mongoose.Schema({

	// The id from the message that has been reacted to.
	messageId: {
		type: String,
		required: true
	},

	// The id from the user that has reacted to this message.
	userId: {
		type: String,
		required: true
	},

	// The id from the reactable that has been used on this message.
	// Required for any Reaction that is not a Global Reaction.
	reactableId: {
		type: Schema.Types.ObjectId,
		required: false
	},

	// Whether this is a Global Reaction, used in Discover or other functions
	// that have built-in Reactables. Only used when reactableId doesn't apply.
	globalReaction: {
		type: Boolean,
		required: false,
		default: false
	}
});

module.exports = mongoose.model("reaction", reactionSchema);