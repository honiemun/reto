const { Guild, Message, PartialMessage } = require("discord.js");
const retoEmojis = require('../data/retoEmojis');
const cachegoose = require("recachegoose");

// Schemas
const guildSchema = require('../schemas/guild');

class Personalisation {

    constructor() {
        if (Personalisation._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Personalisation._instance = this;
    }

    async getGuildKarmaData(guild) {
        const guildDocument = await guildSchema.findOne({
            guildId: guild.id
        })
        .exec();
        if (!guildDocument) return;

        return {
            name: guildDocument.karmaName ? guildDocument.karmaName : guild.name + ' Karma',
            // TO-DO: Can't fetch karma emoji correctly because God has
            // cursed me for my hubris, and my work is never finished
            emoji: guildDocument.karmaEmoji ? guildDocument.karmaEmoji : retoEmojis.karmaEmoji
        }
    }

    async changeGuildKarmaName(guild, karmaName) {
      cachegoose.clearCache(guild + '-guild');

      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'karmaName' : karmaName } },
        { upsert: true }
      )
      .cache(86400, guild + "-guild")
      .exec();
    }

    async changeGuildKarmaEmoji(guild, karmaEmoji) {
      cachegoose.clearCache(guild + '-guild');

      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'karmaEmoji' : karmaEmoji } },
        { upsert: true }
      )
      .cache(86400, guild + "-guild")
      .exec();
    }

    async changeMessageReplyMode(guild, isEmbed) {
      cachegoose.clearCache(guild + '-guild');

      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'messageConfirmation' : isEmbed } },
        { upsert: true }
      )
      .cache(86400, guild + "-guild")
      .exec();
    }
    
    async changeReactionEmbed(guild, title, description) {
      cachegoose.clearCache(guild + '-guild');

      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : {
          'reactionConfirmationTitle' : title,
          'reactionConfirmationDescription' : description
          }
        },
        { upsert: true }
      )
      .cache(86400, guild + "-guild")
      .exec();
    }
}

module.exports = new Personalisation();