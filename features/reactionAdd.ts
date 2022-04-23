import { Client, Emoji, TextChannel } from 'discord.js'
import WOKCommands from 'wokcommands'

// Schemas
import guildSchema from '../schemas/guild';

export default (client: Client, instance: WOKCommands) => {
  // Listen for new members joining a guild
  client.on('messageReactionAdd', async (reaction, user) => {
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
    
    guildSchema.findOne({ id: reaction.message.guildId }, function (err: any, guildData: any) {
      // For each Reactionable that exists inside this guild:
      for (const i in guildData) {
        if (guildData.hasOwnProperty(i) && guildData[i].reactionables) {
          for (const j in guildData[i].reactionables) {
            // If any emoji's ID on this server's reactionable list matches the emoji that we reacted with:
            if (guildData[i].reactionables[j].emojiId == reaction.emoji.name || guildData[i].reactionables[j].emojiId == reaction.emoji.id) {
              console.log("Emoji found!")
            }
          }
        }
      }
    });
    
  });
}

const config = {
  displayName: 'Reaction Add',
  dbName: 'REACTION ADD'
}

export { config }
