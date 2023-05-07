const { Client, Emoji, Guild, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } = require("discord.js");

const Karma = require("../classes/karma");
const Pin = require("../classes/pin");
const WOK = require("wokcommands");

// Schemas
const guildSchema = require("../schemas/guild");
const reactableSchema = require("../schemas/reactable");
const Reaction = require("../classes/reaction");

module.exports = (client, instance) => {


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