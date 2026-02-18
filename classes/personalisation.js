const { Guild, Message, PartialMessage } = require("discord.js");
const retoEmojis = require('../data/retoEmojis');

// Classes
const Parsing = require("../classes/parsing");
const Guide = require("../classes/guide");

// Schemas
const guildSchema = require('../schemas/guild');
const reactableSchema = require('../schemas/reactable');
const pinThresholdSchema = require('../schemas/pinThreshold');

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
      const update = karmaName ?
      { $set: { 'karmaName': karmaName } } :
      { $unset: { 'karmaName': null } }
      
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        update,
        { upsert: true }
      )
      .exec();
    }

    async changeGuildKarmaEmoji(guild, karmaEmoji) {
      const update = karmaEmoji ?
      { $set: { 'karmaEmoji': karmaEmoji } } :
      { $unset: { 'karmaEmoji': null } }
      
      await guildSchema.findOneAndUpdate(
        { guildId: guild },
        update,
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
    
    async changeReactionEmbed(reactableId, title, description) {
      const update = title && description ?
      { $set: {
        'reactionConfirmationTitle' : title,
        'reactionConfirmationDescription' : description
      }} :
      { $unset: { 
        'reactionConfirmationTitle' : null,
        'reactionConfirmationDescription' : null
      }}
      
      await reactableSchema.findOneAndUpdate(
        { _id: reactableId },
        update,
        { upsert: false }
      )
      .exec();
    }

    async updateKarmaThreshold(reactableId, reactionThreshold) {
      await reactableSchema.findOneAndUpdate(
        { _id: reactableId },
        { $set : {
          'reactionThreshold' : reactionThreshold
          }
        },
        { upsert: false }
      )
      .exec();
    }

    async updatePinChannel(reactableId, sendsToChannel) {
      const update = sendsToChannel ?
        { $set: { 'sendsToChannel': sendsToChannel } } :
        { $unset: { 'sendsToChannel': null } }

      await reactableSchema.findOneAndUpdate(
        { _id: reactableId },
        update,
        { upsert: false }
      )
      .exec();
    }
    async createGuideEmbed(client, guild) {
      return Guide.createGuideEmbed(client, guild);
    }

    async naturalJoin(input) {
      if (input.length > 1) return input.slice(0, -1).join(', ') + ' and ' + input.pop();
      return input[0];
    }
}

module.exports = new Personalisation();