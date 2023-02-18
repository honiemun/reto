import { Client, Emoji, Guild, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js'
import Karma from '../classes/karma';
import Pin from '../classes/pin';
import WOKCommands from 'wokcommands'

// Schemas
import guildSchema from '../schemas/guild';
import reactableSchema from '../schemas/reactable';
import Reaction from '../classes/reaction';

export default (client: Client, instance: WOKCommands) => {

  async function messageReactionHandler (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, isPositive: boolean) {
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

      const karmaToAward: number = isPositive
        ? reactable.karmaAwarded
        : reactable.karmaAwarded * -1;

      // Replace message with pinned message, if it exists
      const message = await Pin.getStoredPinnedMessage(reaction.message, client).then((pinnedMessage) => {
        if (pinnedMessage) {
          // TO-DO: Can this be simplified?
          return client.channels.fetch(pinnedMessage.channelId).then((channel) => {
            return (channel as TextChannel).messages.fetch(pinnedMessage.messageId);
          })
        } else return reaction.message;
      })

      if (!message.author) return;
      
      console.log('💕 ' + message.author.username + "'s message has been reacted to (" + karmaToAward + ")");

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
}

const config = {
  displayName: 'Reaction Handler',
  dbName: 'REACTION HANDLER'
}

export { config }
