import { Client, Emoji, Guild, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js'
import Karma from '../classes/karma';
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

      console.log('Give ' + karmaToAward + ' to ' + user.username);

      await Karma.awardKarmaToUser(
        karmaToAward,
        user,
        reaction.message.guildId,
        reaction.message.id
      );

      await Karma.sendKarmaNotification(reaction.message, guildDocument);
    }
  }

  // On reaction added
  client.on('messageReactionAdd', async (reaction, user) => {
    messageReactionHandler(reaction, user, true);
  });

  // On reaction removed
  client.on('messageReactionRemove', async (reaction, user) => {
    messageReactionHandler(reaction, user, false);
  });
}

const config = {
  displayName: 'Reaction Add',
  dbName: 'REACTION ADD'
}

export { config }
