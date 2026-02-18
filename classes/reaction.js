const { Message, PartialMessage, User, PartialUser } = require('discord.js');

// Schemas
const guildSchema = require("../schemas/guild");
const reactableSchema = require("../schemas/reactable");
const reactionSchema = require('../schemas/reaction');

// Classes
const Pin = require("./pin");
const Karma = require("./karma");
const ReactionCheck = require("./reactionCheck");
const Formatting = require("./formatting");

class Reaction {
    
    constructor() {
        if (Reaction._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Reaction._instance = this;
    }

    async messageReactionHandler(reaction, user, isPositive) {
        if (reaction.partial) await reaction.fetch();
        if (user.bot) return;

        const guildDocument = await guildSchema.findOne({
            guildId: reaction.message.guildId
        })
        .exec();
        
        const guildReactables = await reactableSchema.find({
            guildId: reaction.message.guildId
        })
        .exec();

        if (!guildReactables) return;

        for (const reactable of guildReactables) {
            const reactableIsValid = reactable.emojiIds.includes(reaction.emoji.name)
                || reactable.emojiIds.includes(reaction.emoji.id);

            if (!reactableIsValid) continue;
            
            // Fetch member for checks
            const member = await reaction.message.guild.members.fetch(user.id);

            const karmaToAward = isPositive
                ? reactable.karmaAwarded
                : reactable.karmaAwarded * -1;

            // If you're reacting to a Pinned Message,
            // we redirect all points accrued to the original message.
            const message = await Pin.getStoredPinnedMessage(reaction.message).then((pinnedMessage) => {
                if (pinnedMessage) {
                    // TO-DO: Can this be simplified?
                    return reaction.message.client.channels.fetch(pinnedMessage.channelId).then((channel) => {
                        return channel.messages.fetch(pinnedMessage.messageId);
                    })
                } else return reaction.message;
            })
            
            if (!message.author) return;
            
            // Get the reaction count for this reactable
            const reactionCount = await this.getReactionCount(reactable, message);

            // CHECKS
            
            const passesChecks = await this.reactablePassesChecks(message, member, reactable, reactionCount, isPositive, user);
            if (!passesChecks) return;
            
            // Send to console
            await this.sendReactionToConsole(message, user, reactable, karmaToAward, isPositive)

            // Store reaction
            const savedReaction = await this.saveOrDeleteReaction(message, user, reactable, isPositive);
            if (!savedReaction) return;

            // ACTIONS

            // Award the karma total to user
            await Karma.awardKarmaToUser(
                karmaToAward,
                message.author,
                message
            )

            // Send message to channel
            await Pin.pinMessageToChannel(
                message,
                reactable,
                message.client,
                isPositive,
                user
            )

            // Send notification
            await Karma.sendKarmaNotification(
                reaction.message,
                user,
                guildDocument,
                reactable,
                isPositive
            );

            // Send custom reply
            await this.sendReactableReply(
                message,
                user,
                reactable,
                isPositive
            );

            // Apply timeout
            await this.applyTimeout(
                message,
                reactable,
                isPositive
            );

            // Award role to author
            await this.awardRoleToAuthor(
                message,
                reactable,
                isPositive
            );

            // Award role to reactors
            await this.awardRoleToReactors(
                user,
                message.guild,
                reactable,
                isPositive
            );

            // React with emoji
            await this.reactWithEmoji(
                message,
                reactable,
                isPositive
            );

            // Kick user
            await this.kickUser(
                message,
                reactable,
                isPositive
            );

            // Ban user
            await this.banUser(
                message,
                reactable,
                isPositive
            );

            // Delete the message
            const messageWasDeleted = await this.deleteOriginalMessage(message, reactable, isPositive);
            if (messageWasDeleted) break;
        }
    }

    async saveOrDeleteReaction(message, reactingUser, reactable, toSave) {
        //if (await ReactionCheck.checkIfPreviouslyReacted(message, reactingUser, reactable)) return false;

        if (toSave) await this.saveReaction(message, reactingUser, reactable);
        else await this.deleteReaction(message, reactingUser, reactable);
        return true;
    }

    async saveReaction(message, reactingUser, reactable) {
        return new reactionSchema({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).save();
    }

    async deleteReaction(message, reactingUser, reactable) {
        return reactionSchema.deleteMany({
            messageId: message.id,
            userId: reactingUser.id,
            reactableId: reactable._id
        }).exec();
    }

    async deleteOriginalMessage(message, reactable, isPositive) {
        if (reactable.deletesMessage && isPositive) {
            try {
                await message.delete();
                return true;
            } catch (error) {
                console.error("💔 Couldn't delete the message:", error);
            }
        }
        return false;
    }

    async sendReactableReply (message, user, reactable, isPositive) {
        if (!reactable.reply || !isPositive) return;
        
        try {
            const formattedReply = await Formatting.format(reactable.reply, message, user, message.guild, reactable);
            
            await message.reply({
                content: formattedReply,
                allowedMentions: {
                    users: [] // Disable pinging the original author
                }
            });
        } catch (error) {
            console.error("💔 Couldn't send reactable reply:", error);
        }
    }

    async applyTimeout (message, reactable, isPositive) {
        if (!reactable.timeout || reactable.timeout <= 0 || !isPositive) return;
        
        try {
            const member = await message.guild.members.fetch(message.author.id);
            const timeoutDurationMs = reactable.timeout * 1000; // Convert seconds to milliseconds
            
            await member.timeout(timeoutDurationMs, `Timed out by reactable: ${reactable.name}`);
        } catch (error) {
            console.error("💔 Couldn't apply timeout:", error);
        }
    }

    async awardRoleToAuthor(message, reactable, isPositive) {
        if (!reactable.awardedRole) return;

        try {
            const member = await message.guild.members.fetch(message.author.id);
            const role = message.guild.roles.cache.get(reactable.awardedRole);

            if (!role) {
                console.error(`💔 Role ${reactable.awardedRole} not found`);
                return;
            }

            if (isPositive) {
                await member.roles.add(role, `Awarded by reactable: ${reactable.name}`);
            } else {
                await member.roles.remove(role, `Removed by reactable: ${reactable.name}`);
            }
        } catch (error) {
            console.error("💔 Couldn't award role to author:", error);
        }
    }

    async awardRoleToReactors(user, guild, reactable, isPositive) {
        if (!reactable.reactorAwardedRole) return;

        try {
            const role = guild.roles.cache.get(reactable.reactorAwardedRole);

            if (!role) {
                console.error(`💔 Role ${reactable.reactorAwardedRole} not found`);
                return;
            }

            const member = await guild.members.fetch(user.id);

            if (isPositive) {
                await member.roles.add(role, `Awarded by reactable: ${reactable.name}`);
            } else {
                await member.roles.remove(role, `Removed by reactable: ${reactable.name}`);
            }
        } catch (error) {
            console.error("💔 Couldn't award role to reactor:", error);
        }
    }

    async reactWithEmoji(message, reactable, isPositive) {
        if (!reactable.reactionEmoji) return;

        try {
            if (isPositive) {
                await message.react(reactable.reactionEmoji);
            } else {
                // Try to remove the reaction
                const reactions = message.reactions.cache;
                const emojiReaction = reactions.find(r =>
                    r.emoji.name === reactable.reactionEmoji ||
                    r.emoji.id === reactable.reactionEmoji
                );

                if (emojiReaction) {
                    await emojiReaction.remove();
                }
            }
        } catch (error) {
            console.error("💔 Couldn't react with emoji:", error);
        }
    }

    async kickUser(message, reactable, isPositive) {
        if (!reactable.kicksUser || !isPositive) return;

        try {
            const member = await message.guild.members.fetch(message.author.id);
            await member.kick(`Kicked by reactable: ${reactable.name}`);
        } catch (error) {
            console.error("💔 Couldn't kick user:", error);
        }
    }

    async banUser(message, reactable, isPositive) {
        if (!reactable.bansUser || !isPositive) return;

        try {
            await message.guild.members.ban(message.author.id, { reason: `Banned by reactable: ${reactable.name}` });
        } catch (error) {
            console.error("💔 Couldn't ban user:", error);
        }
    }

    async sendReactionToConsole(message, reactingUser, reactable, karmaToAward, isPositive, isDiscovery = false) {
        const reactableName = reactable ? reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1) : "Global Reaction";
        const reactableAmount = " (" + (karmaToAward<0?"":"+") + karmaToAward + ")"
        const reactPrefix = isPositive ? "" : "un"

        if (reactable && reactable.sendsToChannel) {
            console.log('⭐ ' + message.author.username.yellow + " got " + reactPrefix + "reacted by " + reactingUser.username.gray + " with a " + reactableName.yellow.bold + reactableAmount.gray + (isDiscovery ? " (via Discover)".gray : ""));
        } else if (karmaToAward > 0) {
            console.log('💕 ' + message.author.username.red + " got " + reactPrefix + "reacted by " + reactingUser.username.gray + " with a " + reactableName.red.bold + reactableAmount.gray + (isDiscovery ? " (via Discover)".gray : ""));
        } else {
            console.log('💜 ' + message.author.username.magenta + " got " + reactPrefix + "reacted by " + reactingUser.username.gray + " with a " + reactableName.magenta.bold + reactableAmount.gray + (isDiscovery ? " (via Discover)".gray : ""));
        }
    }

    async reactablePassesChecks(message, member, reactable, reactionCount, isPositive, user) {
        /* CHECKS
        Validates whether a reactable passes all its check conditions before executing actions.
        Returns true only if the reactable passes all applicable checks. */

        // Self Reaction
        if (user.id === message.author.id) {
            if (!reactable.selfReaction && !JSON.parse(process.env.DEBUG_MODE)) {
                return false;
            }
        }

        // Reaction Threshold
        if (reactable.reactionThreshold && reactionCount < reactable.reactionThreshold) {
            return false;
        }

        // Fires Once
        if (reactable.firesOnce && isPositive) {
            const hasAlreadyFired = await ReactionCheck.checkIfReactableFired(message, reactable);
            if (hasAlreadyFired) {
                return false;
            }
        }

        // Locked Behind Roles
        if (!await this.checkMemberCanReact(member, reactable)) {
            return false;
        }
        
        // Locked Behind Channels
        if (reactable.lockedBehindChannels && reactable.lockedBehindChannels.length > 0) {
            if (!reactable.lockedBehindChannels.includes(message.channel.id)) {
                return false;
            }
        }

        return true;
    }

    async getReactionCount(reactable, message) {
        // Counts the total reactions on a message that match this reactable's emoji IDs
        let reactionCount = 0;

        if (reactable && reactable.emojiIds) {
            for (const emojiId of reactable.emojiIds) {
                const reaction = message.reactions.cache.get(emojiId);
                if (reaction) {
                    reactionCount += reaction.count;
                }
            }
        }

        return reactionCount;
    }

    async checkMemberCanReact(member, reactable) {
        if (!reactable.lockedBehindRoles || !reactable.lockedBehindRoles.length) return true;

        for (const role of reactable.lockedBehindRoles) {
            if (member.roles.cache.has(role)) {
                return true;
            }
        }

        return false;
    }
    
    // Currently goes un-used - the reactionHandler recursively deletes
    // every reaction if this is implemented.
    /*
    undoReaction: async function (message: Message | PartialMessage, reactingUser: User | PartialUser) {
        const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(reactingUser.id));

        try {
            for (const reaction of userReactions.values()) {
                await reaction.users.remove(reactingUser.id);
            }
        } catch (error) {
            console.error("💔 Couldn't remove the user's repeated reaction");
        }
    }
    */

}

module.exports = new Reaction();