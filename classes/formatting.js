//const { CommandInteraction, Message } = require('discord.js');

// Schemas
const memberSchema = require('../schemas/member');

// Classes
const Personalisation = require("./personalisation");

class Formatting {

    constructor() {
        if (Formatting._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Formatting._instance = this;
    }

    async format (textToFormat, message, reactingUser, guild, reactable) {
        // TO-DO: This is EXTREMELY SLOW. Refactor, maybe? (0.7s)
        if (!textToFormat) return;
        
        const rules = await this.getFormattingRules(message, reactingUser, guild, reactable);
        const regex = /\{(\w+)\}/g; // Find all text in curly braces

        for (const uncleanFormat of textToFormat.match(regex)) {
            const format = uncleanFormat.replace(/[{}]/g, "");
            if (!rules[format]) continue;
            console.log(rules[format])
            textToFormat = textToFormat.replace(uncleanFormat, rules[format])
        }
        
        return textToFormat;
    }

    async getFormattingRules (message, reactingUser, guild, reactable) {
        var rules = {}

        if (message) {
            rules.a  = message.author.username;
            rules.al = message.author.username; // local??
            rules.am = message.author.mention;
            rules.kg = null;
            rules.m  = message.content;
            rules.mk = null;
            rules.c  = message.channel;
            rules.cm = message.channel.reaction;
        }

        if (reactingUser) {
            rules.r  = reactingUser.username;
            console.log(reactingUser)
            rules.rl = reactingUser.username; //reactingUser && guild ? guild.member(reactingUser.author) : null
            rules.rm = null; // reactingUser ? reactingUser.username.mention : null
        }

        if (guild) {
            const guildKarmaData = await Personalisation.getGuildKarmaData(guild)
            rules.s = message.guild.name;
            rules.kn = guildKarmaData.name;
            rules.ke = guildKarmaData.emoji;
        }

        if (message && guild) {
            const memberDatabase = await memberSchema.findOne(
                { userId: message.author.id, guildId: guild.id },
            ).exec()

            const localKarma = memberDatabase && memberDatabase.karma != undefined ? memberDatabase.karma : "0"
            rules.k  = localKarma;
        }
        
        if (reactable) {
            rules.rn = reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1);
            rules.re = reactable.emojiIds[0];
            rules.rk = reactable.karmaAwarded;
            rules.p  = reactable.sendsToChannel;
            rules.pm = reactable.sendsToChannel; // + mention
        }

        return rules
    }
    async getFormattingDescriptions () {
        // Changes from Reto Legacy:
        // - u and um are now a and am, for the sake of clarity (Username is now Author).
        // - Since there can be many "pinnable" channels, b and bm are now p and pm (Best Of -> Pinnable).
        // - Points (a non existing concept) are now rk (Reactable's Karma Awarded).
        return {
            "Author": {
                "a": {
                    "name": "Author",
                    "description": "The global username of the author of the message.",
                },
                "al": {
                    "name": "Author (local)",
                    "description": "The local username (the alias they have on this server) of said author.",
                },
                "am": {
                    "name": "Author (mention)",
                    "description": "A ping to said author.",
                },
                "k": {
                    "name": "Author's Karma",
                    "description": "The amount of Karma the author has on this server.",
                },
                "kg": {
                    "name": "Author's Karma (global)",
                    "description": "The amount of global Karma the author has on this server.",
                }
            },
            "Reactor": {
                "r": {
                    "name": "Reactor",
                    "description": "The global username of the person who reacted to this message.",
                },
                "rl": {
                    "name": "Reactor (local)",
                    "description": "The local username (the alias they have on this server) of said reactor.",
                },
                "rm": {
                    "name": "Reactor (mention)",
                    "description": "A ping to said reactor.",
                }
            },
            "Message": {
                "m": {
                    "name": "Message",
                    "description": "The contents of the message. (text-only)",
                },
                "mk": {
                    "name": "Message Karma",
                    "description": "The amount of total karma this message has.",
                },
                "c": {
                    "name": "Channel",
                    "description": "The name of the channel this message has been posted on.",
                },
                "cm": {
                    "name": "Channel (mention)",
                    "description": "A link to said channel.",
                }
            },
            "Reactable": {
                "rn": {
                    "name": "Reactable Name",
                    "description": "The name of the reactable.",
                },
                "re": {
                    "name": "Reactable Emoji",
                    "description": "The emoji of the reactable.",
                },
                "rk": {
                    "name": "Reactable's Karma Awarded",
                    "description": "The amount of karma given by this reactable.",
                },
                "p": {
                    "name": "Pinnable Channel",
                    "description": "The name of the pinnable channel that corresponds to this reactable. (For example, *best-of*).",
                },
                "pm": {
                    "name": "Pinnable Channel (mention)",
                    "description": "A link to said pinnable channel.",
                }
            },
            "Server": {
                "s": {
                    "name": "Server",
                    "description": "The name of the server the message has been sent to.",
                },
                "kn": {
                    "name": "Karma Name",
                    "description": "The name this server uses for Karma.",
                },
                "ke": {
                    "name": "Karma Emoji",
                    "description": "The emoji this server uses for Karma.",
                }
            }
        }
    }
}

module.exports = new Formatting();