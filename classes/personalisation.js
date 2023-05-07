const { Guild, Message, PartialMessage } = require("discord.js");
const retoEmojis = require('../data/retoEmojis');

// Schemas
const guildSchema = require('../schemas/guild');

module.exports = class Personalisation {
    static async getGuildKarmaData(guild) {
        const guildDocument = await guildSchema.findOne({
            guildId: guild.id
        }).exec();
        if (!guildDocument) return;

        return {
            name: guildDocument.karmaName ? guildDocument.karmaName : guild.name + ' Karma',
            // TO-DO: Can't fetch karma emoji correctly because God has
            // cursed me for my hubris, and my work is never finished
            emoji: guildDocument.karmaEmoji ? guildDocument.karmaEmoji : retoEmojis.karmaEmoji
        }
    }

    static async changeGuildKarmaName(guild, karmaName) {
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'karmaName' : karmaName } },
        { upsert: true }
      ).exec();
    }

    static async changeGuildKarmaEmoji(guild, karmaEmoji) {
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'karmaEmoji' : karmaEmoji } },
        { upsert: true }
      ).exec();
    }

    static async changeMessageReplyMode(guild, isEmbed) {
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'messageConfirmation' : isEmbed } },
        { upsert: true }
      ).exec();
    }
    
    static async changeReactionEmbed(guild, title, description) {
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : {
          'reactionConfirmationTitle' : title,
          'reactionConfirmationDescription' : description
          }
        },
        { upsert: true }
      ).exec();
    }
}