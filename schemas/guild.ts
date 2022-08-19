import mongoose from "mongoose";
import reactableSchema from './reactable';
import userSchema from './user';
import memberSchema from './member';

/*
GUILD:
Keeps track of guilds and their current settings.
Acts as a hub for other schemas, currently.
*/

const guildSchema = new mongoose.Schema({

	// The guild's id.
	guildId: {
		type: Number,
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
		type: Boolean,
		required: false
	},

	// The type of confirmation that is sent after a Reactable triggers in this guild.
	// Can be one of three values: Message, Reaction and None.
	reactionConfirmation: {
		type: String,
		required: false,
		default: "Message"
	},

	// The emoji that is used to react to messages after a successful Reactable execution.
	// Only used if reactionConfirmation = "Reaction".
	reactionConfirmationEmoji: {
		type: String,
		required: false
	},

	// The guild's Karma scores for each User.
	// TO-DO: This doesn't show up. Fix please :)
	members: memberSchema.schema,

	// An array of every Reactable object a server has.
	reactables: [reactableSchema.schema],

	// An array of every User object a server has.
	// TO-DO: This doesn't show up, either. Fix please :)
	users: userSchema.schema
});

export default mongoose.model("guild", guildSchema);