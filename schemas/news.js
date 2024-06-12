
const mongoose = require("mongoose");

/*
NEWS:
Stores news articles available through /newsletter.
*/

const newsSchema = new mongoose.Schema({

	// The news' title.
	title: {
		type: String,
		required: true
	},
	
	// The message ID assigned to this news article.
    messageId: {
        type: String,
        required: true
    },

    // URL that's used as a button link alongside a news article.
    url: {
        type: String, // Links
        required: false
    },

    // The URL button's text, if applicable.
    urlText: {
        type: String,
        required: false
    },

    // Whether the news article is visible on /newsletter or not.
    published: {
        type: Boolean,
        required: true,
        default: true
    },

    // The message IDs of news articles that have already been broadcasted to a channel.
    broadcastedIds: {
        type: [String],
        required: false
    },

    // The date the news article was created.
    createdAt: {
        type: Date,
        default: Date.now
    }
    
});

module.exports = mongoose.model("news", newsSchema);