const { mongoose, Schema } = require("mongoose");

/*
SELECTED MESSAGE:
Stores a message that an user has selected
via a Context Menu. These can be used to add
Context to a Starred message, among other things.
*/

const selectedMessageSchema = new mongoose.Schema({

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

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // 1 hour
    }
});

module.exports = mongoose.model("selectedMessage", selectedMessageSchema);