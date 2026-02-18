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
	},
	
	/* CHECKS
	These are the tests that must run to determine whether this reactable will fire. */

	// Whether users can react to their own messages with this reactable.
	selfReaction: {
		type: Boolean,
		required: false,
		default: false
	},

	// This determines how many reactions are needed to perform any actions.
	reactionThreshold: {
		type: Number,
		required: false,
		default: 0
	},

	// Determines if this reactable can only be used once per message.
	firesOnce: {
		type: Boolean,
		required: false,
		default: false
	},

	// An array of the roles you need to use this reactable.
	lockedBehindRoles: {
		type: Array,
		required: false,
	},
	
	/* ACTIONS
	These are the actions that a Reactable can perform when activated. */

	// The ID of the channel this reactable sends a post to.
	sendsToChannel: {
		type: String,
		required: false
	},

	// The amount of karma this reactable awards. Can be positive or negative.
	karmaAwarded: {
		type: Number,
		required: false,
		default: 0
	},

	// Determines if the original message should be deleted when this reactable is used.
	deletesMessage: {
		type: Boolean,
		required: false,
		default: false
	},

	// A custom message that the bot will reply with when the reactable is used.
	// As messageConfirmation is a guild-wide setting, this allows you to have a custom message per Reactable
	// if you still wish to keep other reactables like Karma as reaction-confirmations.
	reply: {
		type: String,
		required: false
	},

	// Puts the original writer in timeout for X amount of time (in seconds).
	timeout: {
		type: Number,
		required: false,
		default: 0
	},

	// ID of role to award to the original writer when the reactable is used.
	awardedRole: {
		type: String,
		required: false
	},

	// ID of role to award to reactors when the reactable is used.
	reactorAwardedRole: {
		type: String,
		required: false
	},

	// ID of emoji to react to this message with.
	reactionEmoji: {
		type: String,
		required: false
	},

	// Whether this reactable should kick the original writer when used.
	kicksUser: {
		type: Boolean,
		required: false,
		default: false
	},

	// Whether this reactable should ban the original writer when used.
	bansUser: {
		type: Boolean,
		required: false,
		default: false
	}
});

module.exports = mongoose.model("reactable", reactableSchema);