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
	reactableId: {
		type: Schema.Types.ObjectId,
		required: true
	}
});

module.exports = mongoose.model("reaction", reactionSchema);