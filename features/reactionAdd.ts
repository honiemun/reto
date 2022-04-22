import { Client, TextChannel } from 'discord.js'
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
      // for each guilddata
      guildData.entries(Object).forEach((guildElement: any) => {
        console.log(guildElement);
      });
    });
    
  });
}

const config = {
  displayName: 'Reaction Add',
  dbName: 'REACTION ADD'
}

export { config }
