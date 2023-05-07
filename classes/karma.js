const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const messageSchema = require('../schemas/message');
const retoEmojis = require('../data/retoEmojis');
const { User, PartialUser, Message, PartialMessage } = require('discord.js');
const Formatting = require('./formatting');

module.exports = class Karma {
	static async awardKarmaToUser (karmaToAward, user, message) {
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

	static async sendKarmaNotification (message, guildDocument, reactable) {
		if (guildDocument.messageConfirmation) {
			message.reply({
				embeds: [
					{
						title: await Formatting.format(reactable.reactionConfirmationTitle, message, message.guild, reactable) ??
							   await Formatting.format("{rl} gave {al} message a {rn} {re}", message, message.guild, reactable),
						description: await Formatting.format(reactable.reactionConfirmationDescription, message, message.guild, reactable) ??
							   await Formatting.format("{am} now has {ke} {kn} `{k}`.", message, message.guild, reactable)
					}
				],
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