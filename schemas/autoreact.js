const { mongoose, Schema } = require("mongoose");

/*
AUTOREACT:
Keeps track of the reactables that need
to be reacted on for every post a member
makes in a channel.
*/

const autoreactSchema = new mongoose.Schema({

	// The reactable assigned to this autoreact rule.
	reactableId: {
		type: Schema.Types.ObjectId,
		required: true
	},

    // The channel assigned to this autoreact rule.
    channelId: {
        type: String,
        required: true
    },

    // The guild assigned to this channel. Used only for listing.
    guildId: {
        type: String,
        required: true
    },

    // The types of content that will result in an auto-reaction.
    contentTypes: {
        type: [String],
        enum: ['text', 'media', 'file', 'embed'],
        required: true
    },
});

module.exports = mongoose.model("autoreact", autoreactSchema);