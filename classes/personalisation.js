const { Guild, Message, PartialMessage } = require("discord.js");
const retoEmojis = require('../data/retoEmojis');

// Classes
const Parsing = require("../classes/parsing");

// Schemas
const guildSchema = require('../schemas/guild');
const reactableSchema = require('../schemas/reactable');

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
      const reactableDocument = await reactableSchema.find({
        guildId: guild.id
      })
      .exec();

      const guildKarma = await this.getGuildKarmaData(guild)

      let embed = {
          "title": "Welcome to Reto on " + guild.name + "!",
          "description": "A Karma and Starboard bot for the modern era - react to your favorite messages, earn Karma for hanging around and highlight the best moments on " + guild.name + ".\n\nHere's all the things you can do with Reto:",
          "color": 0xff4ae4,
          "fields": []
      }

      for (const reactable of reactableDocument) {
        let tutorial = []

        // Role locked
        if (reactable.lockedBehindRoles.length != 0) {
          const lockedBehindRoles = reactable.lockedBehindRoles.map(i => "<@&" + i + ">")
          const rolePlural = reactable.lockedBehindRoles.length > 1 ? " roles" : " role"
          tutorial.push("- Only members with the " + await this.naturalJoin(lockedBehindRoles) + rolePlural + " can use this reactable.");
        }

        // Role locked
        if (reactable.karmaAwarded != 0) {
          tutorial.push("- Reacting with this gives the author `"  + (reactable.karmaAwarded<0?"":"+") + reactable.karmaAwarded + "` to their " + guildKarma.emoji + " " + guildKarma.name + "!");
          if (!reactable.globalKarma) {
            tutorial.push("- (Getting this reaction doesn't contribute to your Global Karma.)");
          }
        }

        // Sent to channel(s)
        if (reactable.sendsToChannel && reactable.reactionThreshold == 1) {
          tutorial.push("- This reaction sends your message to the <#" + reactable.sendsToChannel + "> channel!");
        } else if (reactable.sendsToChannel && reactable.reactionThreshold > 1) {
          tutorial.push("- Getting this reaction " + reactable.reactionThreshold + " or more times sends your message to the <#" + reactable.sendsToChannel + "> channel!");
        }

        // Multiple emoji
        if (reactable.emojiIds.length > 1) {
          const emojis = reactable.emojiIds.map(i => isNaN(i) ? i :"<:emoji:" + i + ">")
          tutorial.push("- You can react with any of these emoji: " + await this.naturalJoin(emojis) + ".");
        }

        const defaultEmoji = await Parsing.emoji(reactable.emojiIds[0], guild);

        embed.fields.push({
          "name": defaultEmoji + " " + reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1),
          "value": tutorial.join("\n")
        })
      }

      // TO-DO: Support for Democracy Mode
      //                    Awardable Roles

      // Everything else
      embed.fields.push({
        "name": "You can also...",
        "value": `- Use \`/profile\` to check your karma!\n- Fight for the top spot on the \`/leaderboard\` - on this server or throughout Reto`
      })

      return embed;
    }

    async naturalJoin(input) {
      if (input.length > 1) return input.slice(0, -1).join(', ') + ' and ' + input.pop();
      return input[0];
    }
}

module.exports = new Personalisation();