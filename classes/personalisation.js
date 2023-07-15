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
        .cache(process.env.CACHE_TIME, guild.id + "-guild")
        .exec();
        if (!guildDocument) return;

        return {
            name: guildDocument.karmaName ? guildDocument.karmaName : guild.name + ' Karma',
            // TO-DO: Can't fetch karma emoji correctly because God has
            // cursed me for my hubris, and my work is never finished
            emoji: guildDocument.karmaEmoji ? guildDocument.karmaEmoji : retoEmojis.karmaEmoji
        }
    }

    async changeGuildKarmaName(guildId, karmaName) {
      await guildSchema.findOneAndUpdate(
        { guildId: guildId },
        { $set : { 'karmaName' : karmaName } },
        { upsert: true }
      )
      .cache(process.env.CACHE_TIME, guildId + "-guild")
      .exec();
      
      cachegoose.clearCache(guildId + '-guild');
    }

    async changeGuildKarmaEmoji(guildId, karmaEmoji) {
      await guildSchema.findOneAndUpdate(
        { guildId: guildId },
        { $set : { 'karmaEmoji' : karmaEmoji } },
        { upsert: true }
      )
      .cache(process.env.CACHE_TIME, guildId + "-guild")
      .exec();

      cachegoose.clearCache(guildId + '-guild');
    }

    async changeMessageReplyMode(guildId, isEmbed) {
      await guildSchema.findOneAndUpdate(
        { guildId: guildId },
        { $set : { 'messageConfirmation' : isEmbed } },
        { upsert: true }
      )
      .cache(process.env.CACHE_TIME, guildId + "-guild")
      .exec();
      
      cachegoose.clearCache(guildId + '-guild');
    }
    
    async changeReactionEmbed(guildId, title, description) {
      await guildSchema.findOneAndUpdate(
        { guildId: guildId },
        { $set : {
          'reactionConfirmationTitle' : title,
          'reactionConfirmationDescription' : description
          }
        },
        { upsert: true }
      )
      .cache(process.env.CACHE_TIME, guildId + "-guild")
      .exec();

      cachegoose.clearCache(guildId + '-guild');
    }
}

module.exports = new Personalisation();