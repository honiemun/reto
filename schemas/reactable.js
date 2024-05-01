const mongoose = require("mongoose");

/*
REACTABLE:
Emoji that Reto stores and is actively looking for in chat.
These perform different functions, depending on the values set below.

In Reto Legacy, reactables were only :plus:, :minus: and :10:.
This new system aims to de-hardcode reactables, and make them customisable
on a guild by guild basis.
*/

const reactableSchema = new mongoose.Schema({

	// The ID of the guild this reactable is used on.
	guildId: {
		type: String,
		required: true
	},

	// The ID of the emoji this reactable belongs to.
	emojiIds: {
		type: Array,
		required: true,
	},

	// The name the reactable will be referred to in text, since one Reactable can have many Emoji.
	// Used only for communication purposes.
	name: {
		type: String,
		required: true
	},

	// The ID of the channel this reactable sends a post to.
	sendsToChannel: {
		type: String,
		required: false
	},

	// If sendsToChannel is set, this determines how many reactions are needed to send this message.
	reactionThreshold: {
		type: Number,
		required: false,
		default: 0
	},

	// The amount of karma this reactable awards. Can be positive or negative.
	karmaAwarded: {
		type: Number,
		required: false,
		default: 0
	},

	// An array of the roles you need to use this reactable.
	lockedBehindRoles: {
		type: Array,
		required: false,
	},

	// Determines if this reactable awards Karma on a global karma basis.
	globalKarma: {
		type: Boolean,
		required: false,
		default: false
	},

	// The header of the embed that's sent after a successful Reactable execution.
	// Only used if messageConfirmation is True.
	reactionConfirmationTitle: {
		type: String,
		required: false
	},

	// The description of the embed that's sent after a successful Reactable execution.
	// Only used if messageConfirmation is True.
	reactionConfirmationDescription: {
		type: String,
		required: false
	}
});

module.exports = mongoose.model("reactable", reactableSchema);