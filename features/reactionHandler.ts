import { Client, Emoji, Guild, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js'
import Karma from '../classes/karma';
import WOKCommands from 'wokcommands'

// Schemas
import guildSchema from '../schemas/guild';

export default (client: Client, instance: WOKCommands) => {

  async function messageReactionHandler (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, isPositive: boolean) {
    // Partial messages are those that haven't been cached,
    // and require being fetched before use.
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error);
        return;
      }
    }

    // Ignore bots
    if (user.bot) return;

    // TODO: Ignore oneself

    guildSchema.findOne({ id: reaction.message.guildId }, function (err: any, guildData: any) {
      // For each Reactable that exists inside this guild:
      for (const i in guildData) {
        if (guildData.hasOwnProperty(i) && guildData[i].reactables) {
          for (const j in guildData[i].reactables) {
            var currentReactable = guildData[i].reactables[j];
            // If any emoji's ID on this server's reactable list matches the emoji that we reacted with:
            // TO-DO: Make this work with emojiIds (an array!)
            if (currentReactable.emojiId == reaction.emoji.name || currentReactable.emojiId == reaction.emoji.id) {
              
              // AWARD KARMA
              if (currentReactable.karmaAwarded != 0) {
                // Invert value if positive is null (for removing Karma from user)
		            var karmaToAward: number = isPositive ? currentReactable.karmaAwarded : currentReactable.karmaAwarded * -1;
                console.log('Give ' + karmaToAward + ' to ' + reaction.message.author?.username);
                
                Karma.awardKarmaToUser(karmaToAward, reaction.message.author, reaction.message.guildId, reaction.message.id);
              }

              // SEND NOTIFICATION
              Karma.sendKarmaNotification(currentReactable, guildData[i].reactionConfirmation, guildData[i].reactionConfirmationEmoji, reaction.message);
            }
          }
        }
      }
    });
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
