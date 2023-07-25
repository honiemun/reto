const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const messageSchema = require('../schemas/message');
const retoEmojis = require('../data/retoEmojis');
const { User, PartialUser, Message, PartialMessage } = require('discord.js');
const Formatting = require('./formatting');

class Karma {
	
    constructor() {
        if (Karma._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Karma._instance = this;
    }

	async awardKarmaToUser (karmaToAward, user, message) {
		// Update the message's karma
		// TO-DO: Check for user's canStoreMessages permission first
		await messageSchema.findOneAndUpdate(
			{ messageId: message.id },
			{
				$set: { 'userId': user.id, 'guildId': message.guildId, 'channelId': message.channel.id },
				$inc : { 'karma' : karmaToAward }
			},
			{ upsert: true }
		).exec();
		
		// Don't execute the following if the karma equals zero
		if (karmaToAward == 0) return;

		// Update the user's global karma
		await userSchema.findOneAndUpdate(
			{ userId: user.id },
			{ $inc : { 'globalKarma' : karmaToAward } },
			{ upsert: true }
		).exec();
	
		// Update the member's karma on the specified guild
		await memberSchema.findOneAndUpdate(
			{ userId: user.id, guildId: message.guildId },
			{ $inc : { 'karma' : karmaToAward } },
			{ upsert: true }
		).exec();
	}

	async sendKarmaNotification (message, user, guildDocument, reactable, isPositive) {
		if (guildDocument.messageConfirmation && isPositive) {
			message.reply({
				embeds: [
					{
						title: reactable.reactionConfirmationTitle ?
							    await Formatting.format(reactable.reactionConfirmationTitle, message, user, message.guild, reactable) :
							    await Formatting.format("{r} gave {a}'s message a {re} {rn}", message, user, null, reactable),
						description: reactable.reactionConfirmationDescription ?
								await Formatting.format(reactable.reactionConfirmationDescription, message, user, message.guild, reactable) :
							    await Formatting.format("**{a}** now has {ke} `{k}` **{kn}**.", message, null, message.guild, null)
					},
				],
				allowedMentions: {
					users: [] // Disable pinging the original author
				}
			}).then((reply) => {
				setTimeout(() => {
					reply.delete();
				}, 5 * 1000);
			});
		} else {
			const reactionEmoji = guildDocument.reactionConfirmationEmoji ? guildDocument.reactionConfirmationEmoji : retoEmojis.confirmationEmoji;
			message.react(reactionEmoji).then((reaction) => {
				setTimeout(() => {
					reaction.remove();
				}, 2 * 1000);
			})
		}
	}
}

module.exports = new Karma();