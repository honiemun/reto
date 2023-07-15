const { Guild, Message, PartialMessage } = require("discord.js");
const retoEmojis = require('../data/retoEmojis');

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
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'karmaName' : karmaName } },
        { upsert: true }
      )
      .exec();
    }

    async changeGuildKarmaEmoji(guild, karmaEmoji) {
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'karmaEmoji' : karmaEmoji } },
        { upsert: true }
      )
      .exec();
    }

    async changeMessageReplyMode(guild, isEmbed) {
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : { 'messageConfirmation' : isEmbed } },
        { upsert: true }
      )
      .exec();
    }
    
    async changeReactionEmbed(guild, title, description) {
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        { $set : {
          'reactionConfirmationTitle' : title,
          'reactionConfirmationDescription' : description
          }
        },
        { upsert: true }
      )
      .exec();
    }
}

module.exports = new Personalisation();