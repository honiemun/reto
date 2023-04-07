const { Client, Emoji, Guild, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } = require("discord.js");

const Karma = require("../classes/karma");
const Pin = require("../classes/pin");
const WOK = require("wokcommands");

// Schemas
const guildSchema = require("../schemas/guild");
const reactableSchema = require("../schemas/reactable");
const Reaction = require("../classes/reaction");

module.exports = (client, instance) => {

  async function messageReactionHandler (reaction, user, isPositive) {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;
    // TO-DO: Return if the reactor is the same as the author.

    const guildDocument = await guildSchema.findOne({
      guildId: reaction.message.guildId
    }).exec();
    
    const guildReactables = await reactableSchema.find({
      guildId: reaction.message.guildId
    }).exec();

    if (!guildReactables) return;

    for (const reactable of guildReactables) {

      const reactableIsValid = reactable.emojiIds.includes(reaction.emoji.name)
        || reactable.emojiIds.includes(reaction.emoji.id);

      if (!reactableIsValid) continue;

      const karmaToAward = isPositive
        ? reactable.karmaAwarded
        : reactable.karmaAwarded * -1;

      // Replace message with pinned message, if it exists
      const message = await Pin.getStoredPinnedMessage(reaction.message, client).then((pinnedMessage) => {
        if (pinnedMessage) {
          // TO-DO: Can this be simplified?
          return client.channels.fetch(pinnedMessage.channelId).then((channel) => {
            return channel.messages.fetch(pinnedMessage.messageId);
          })
        } else return reaction.message;
      })

      if (!message.author) return;
      
      console.log('💕 ' + message.author.username + "'s message has been reacted to (" + karmaToAward + ")");

      // Check if the reaction isn't duplicated
      if (await Reaction.checkIfPreviouslyReacted(message, user, reactable) && isPositive) return; // Exit if the message has been reacted (positive)
      else if (await Reaction.checkIfPreviouslyReacted(message, user, reactable) < 1 && !isPositive) return; // Exit if the message hasn't been reacted (negative)

      // Store reaction
      const savedReaction = await Reaction.saveOrDeleteReaction(message, user, reactable, isPositive);
      if (!savedReaction) return;

      // Award the karma total to user
      await Karma.awardKarmaToUser(
        karmaToAward,
        message.author,
        message
      )

      // Send message to channel
      await Pin.pinMessageToChannel(
        message,
        reactable,
        client
      )

      // Send notification
      await Karma.sendKarmaNotification(reaction.message, guildDocument);
    }
  }

  // On reaction added
  client.on('messageReactionAdd', async (reaction, user) => {
    await messageReactionHandler(reaction, user, true);
  });

  // On reaction removed
  client.on('messageReactionRemove', async (reaction, user) => {
    await messageReactionHandler(reaction, user, false);
  });

  // On message edited
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    await Pin.pinMessageToChannel(
      newMessage,
      false,
      client
    )
  });

  // On message deleted
  client.on('messageDelete', async (message) => {
    await Pin.deleteMessage(
      message,
      client
    )
  });
}

module.exports.config = {
  displayName: 'Reaction Handler',
  dbName: 'REACTION HANDLER'
}