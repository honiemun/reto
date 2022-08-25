import { Client, Emoji, Guild, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js'
import Karma from '../classes/karma';
import Pin from '../classes/pin';
import WOKCommands from 'wokcommands'

// Schemas
import guildSchema from '../schemas/guild';
import reactableSchema from '../schemas/reactable';

export default (client: Client, instance: WOKCommands) => {

  async function messageReactionHandler (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, isPositive: boolean) {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;
    // TO-DO: Ignore oneself.
    
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

      console.log('💕 ' + user.username + "'s message has been reacted to (" + karmaToAward + ")");

      // Award the karma total to user
      await Karma.awardKarmaToUser(
        karmaToAward,
        user,
        reaction.message.guildId,
        reaction.message.id
      )
      
      // Send message to channel
      if (reactable.sendsToChannel && isPositive) await Pin.pinMessageToChannel(
        reaction.message,
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
