const mongoose = require("mongoose");

/*
GUILD:
Keeps track of guilds and their current settings.
Acts as a hub for other schemas, currently.
*/

const guildSchema = new mongoose.Schema({

	// The guild's id.
	// This number gets truncated if stored as an int, so we're storing it as a string instead.
	guildId: {
		type: String,
		required: true
	},

	// The guild's name for Karma.
	// If this is not set, the local karma will be generated on demand using the current server name.
	karmaName: {
		type: String,
		required: false
	},

	// The guild's custom emoji for Karma.
	// If this is not set, the karma icon will default to a custom-made emoji.
	karmaEmoji: {
		type: String,
		required: false
	},

	// Determines if the message confirmation for this guild is enabled.
	// If this is not set, the guild will use Reaction confirmations.
	messageConfirmation: {
		type: Boolean,
		required: false,
		default: false
	},

	// The emoji that is used to react to messages after a successful Reactable execution.
	// Only used if messageConfirmation is False.
	reactionConfirmationEmoji: {
		type: String,
		required: false
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

	// Determines if the guild can be seen in public-related commands, such as Global Leaderboards.
	public: {
		type: Boolean,
		required: false,
		default: false
	}
});

module.exports = mongoose.model("guild", guildSchema);