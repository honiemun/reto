import { Client, TextChannel } from 'discord.js'
import WOKCommands from 'wokcommands'

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
  
    console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
    console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
  });
}

const config = {
  displayName: 'Reaction Add',
  dbName: 'REACTION ADD'
}

export { config }
