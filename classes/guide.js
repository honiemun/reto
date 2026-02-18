const retoEmojis = require('../data/retoEmojis');

// Classes
const Parsing = require("../classes/parsing");

// Schemas
const reactableSchema = require('../schemas/reactable');
const pinThresholdSchema = require('../schemas/pinThreshold');
const Personalisation = require("../classes/personalisation");

class Guide {

    constructor() {
        if (Guide._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Guide._instance = this;
    }

    async createGuideEmbed(client, guild) {
      const reactableDocument = await reactableSchema.find({
        guildId: guild.id
      })
      .exec();

      const pinThresholdDocument = await pinThresholdSchema.find({
        guildId: guild.id
      })
      .exec();

      const guildKarma = await Personalisation.getGuildKarmaData(guild)

      let embed = {
          "title": "Welcome to Reto on " + guild.name + "!",
          "description": "A Karma and Starboard bot for the modern era - react to your favorite messages, earn Karma for hanging around and highlight the best moments on " + guild.name + ".\n\nHere's all the things you can do with Reto:",
          "color": 0xff4ae4,
          "fields": []
      }

      // Reactables
      for (const reactable of reactableDocument) {
        let tutorial = []

        // ACTIONS
        // Karma
        if (reactable.karmaAwarded != 0) {
          tutorial.push("- Reacting with this gives the author `"  + (reactable.karmaAwarded<0?"":"+") + reactable.karmaAwarded + "` to their " + guildKarma.emoji + " " + guildKarma.name + "!");
          if (!reactable.globalKarma) {
            tutorial.push("- (Getting this reaction doesn't contribute to your Global Karma.)");
          }
        }

        // Send to channel
        if (reactable.sendsToChannel && reactable.reactionThreshold == 1) {
          tutorial.push("- This reaction sends your message to the <#" + reactable.sendsToChannel + "> channel!");
        } else if (reactable.sendsToChannel && reactable.reactionThreshold > 1) {
          tutorial.push("- Getting this reaction " + reactable.reactionThreshold + " or more times sends your message to the <#" + reactable.sendsToChannel + "> channel!");
        }

        // Reply
        /*
        if (reactable.reply) {
          tutorial.push("- The bot replies with: *" + reactable.reply + "*");
        }*/

        // React to Message
        if (reactable.reactionEmoji) {
          tutorial.push("- The bot reacts to the message with " + reactable.reactionEmoji + ".");
        }

        // Delete Message
        if (reactable.deletesMessage) {
          tutorial.push("- The original message is deleted when this reactable is used.");
        }

        // Give Role to Author
        if (reactable.awardedRole) {
          tutorial.push("- The original author is given the <@&" + reactable.awardedRole + "> role.");
        }

        // Give Role to Reactor
        if (reactable.reactorAwardedRole) {
          tutorial.push("- Reactors are given the <@&" + reactable.reactorAwardedRole + "> role.");
        }

        // Timeout Author
        if (reactable.timeout && reactable.timeout > 0) {
          tutorial.push("- The original author is timed out for " + reactable.timeout + " seconds.");
        }

        // Kick Author
        if (reactable.kicksUser) {
          tutorial.push("- The original author is kicked from the server.");
        }

        // Ban Author
        if (reactable.bansUser) {
          tutorial.push("- The original author is banned from the server.");
        }

        // Multiple emoji
        if (reactable.emojiIds && reactable.emojiIds.length > 1) {
          const emojis = reactable.emojiIds.map(i => isNaN(i) ? i :"<:emoji:" + i + ">")
          tutorial.push("- You can react with any of these emoji: " + await Personalisation.naturalJoin(emojis) + ".");
        }

        // CHECKS
        // Role locked
        if (reactable.lockedBehindRoles && reactable.lockedBehindRoles.length != 0) {
          const lockedBehindRoles = reactable.lockedBehindRoles.map(i => "<@&" + i + ">")
          const rolePlural = reactable.lockedBehindRoles.length > 1 ? " roles" : " role"
          tutorial.push("- Only members with the " + await Personalisation.naturalJoin(lockedBehindRoles) + rolePlural + " can use this reactable.");
        }

        // Fires Once
        if (reactable.firesOnce) {
          tutorial.push("- This reactable can only be used once per message.");
        }

        // Self React
        if (reactable.selfReaction) {
          tutorial.push("- You can react to your own messages.");
        }

        // Reaction Threshold
        if (reactable.reactionThreshold && reactable.reactionThreshold > 0) {
          tutorial.push("- This reactable requires " + reactable.reactionThreshold + " reaction" + (reactable.reactionThreshold > 1 ? "s" : "") + " to trigger.");
        }
        
        const defaultEmoji = await Parsing.emoji(reactable.emojiIds[0], guild);

        embed.fields.push({
          "name": defaultEmoji + " " + reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1),
          "value": tutorial.join("\n")
        })
      }

      // Pin Thresholds
      let thresholdTutorial = []
      for (const pinThreshold of pinThresholdDocument) {
        if (!pinThreshold.channelId || !pinThreshold.karma) return;
        thresholdTutorial.push("- Messages with `" + (pinThreshold.karma<0?"":"+") + pinThreshold.karma + "` " + guildKarma.emoji + " will be sent to the <#" + pinThreshold.channelId + "> channel!");
      }

      if (thresholdTutorial.length) {
        embed.fields.push({
          "name": guildKarma.emoji + " " + guildKarma.name,
          "value": thresholdTutorial.join("\n")
        })
      }

      // TO-DO: Support for Awardable Roles

      // Everything else
      embed.fields.push({
        "name": "You can also...",
        "value": `- Use \`/profile\` to check your karma!\n- Fight for the top spot on the \`/leaderboard\` - on this server or throughout Reto\n- Flip through the top-voted messages on your server with \`/discover\``
      })

      return embed;
    }
}

module.exports = new Guide();
