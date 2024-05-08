//const { CommandInteraction, Message } = require('discord.js');

// Schemas
const memberSchema = require('../schemas/member');
const userSchema = require('../schemas/user');

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
        const uncleanFormats = textToFormat.match(regex);
        if (!uncleanFormats) return textToFormat;
        
        for (const uncleanFormat of uncleanFormats) {
            const format = uncleanFormat.replace(/[{}]/g, "");
            if (rules[format] == null) continue;
            textToFormat = textToFormat.replace(uncleanFormat, rules[format])
        }
        
        return textToFormat;
    }

    async getFormattingRules (message, reactingUser, guild, reactable) {
        var rules = {}

        if (message) {
            rules.a  = message.author.username;
            rules.m  = message.content;
            rules.c  = "<#" + message.channel + ">"
            
            // rules.am = message.author.mention;
            // rules.mk = null;

            const userDatabase = await userSchema.findOne(
                { userId: message.author.id },
            ).exec()
            const globalKarma = userDatabase && userDatabase.karma != undefined ? userDatabase.karma : "0"
            
            rules.kg = globalKarma;
        }

        if (reactingUser) {
            rules.r  = reactingUser.username;

            // rules.rl = reactingUser.nickname;
            // rules.rm = "<@&" + reactingUser.id + ">";
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
            rules.re = this.emoji(reactable.emojiIds[0], guild);
            rules.rk = reactable.karmaAwarded;
            rules.p  = "<#" + reactable.sendsToChannel + ">";
        }

        return rules
    }

    async getFormattingDescriptions () {
        // Changes from Reto Legacy:
        // - u and um are now a and am, for the sake of clarity (Username is now Author).
        // - Since there can be many "pinnable" channels, b and bm are now p and pm (Best Of -> Pinnable).
        // - Points (a non existing concept) are now rk (Reactable's Karma Awarded).

        // Any commented options are either too performant-heavy or require additional Intents.

        return {
            "Author": {
                "a": {
                    "name": "Author",
                    "description": "The global username of the author of the message.",
                },
                /*
                "al": {
                    "name": "Author (local)",
                    "description": "The local username (the alias they have on this server) of said author.",
                },
                "am": {
                    "name": "Author (mention)",
                    "description": "A ping to the author of the message.",
                },
                */
                "k": {
                    "name": "Author's Karma",
                    "description": "The amount of Karma the author has on this server.",
                },
                "kg": {
                    "name": "Author's Karma (global)",
                    "description": "The amount of global Karma the author has.",
                }
            },
            "Reactor": {
                "r": {
                    "name": "Reactor",
                    "description": "The username of the person who reacted to this message.",
                },
                /*
                "rl": {
                    "name": "Reactor (local)",
                    "description": "The server nickname of said reactor.",
                },
                "rm": {
                    "name": "Reactor (mention)",
                    "description": "A ping to said reactor.",
                }
                */
            },
            "Message": {
                "m": {
                    "name": "Message",
                    "description": "The contents of the message. (text-only)",
                },
                /*
                "mk": {
                    "name": "Message Karma",
                    "description": "The amount of total karma this message has.",
                },
                */
                "c": {
                    "name": "Channel",
                    "description": "The channel this message has been posted on.",
                },
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
                    "description": "The pinnable channel that corresponds to this reactable. (For example, *#best-of*).",
                },
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

    
    async arrayToCommaOrString(arr) {
        if (arr.length === 1) {
            return arr[0];
        } else if (arr.length >= 2) {
            const lastTwo = arr.slice(-2).join(' or ');
            const rest = arr.slice(0, -2).join(', ');
            return rest.length > 0 ? `${rest}, ${lastTwo}` : lastTwo;
        } else {
            return '';
        }
    }

    async formatTime(seconds) {
        const time = new Date(seconds * 1000).toISOString();
        const days = Math.floor(seconds / (3600 * 24));
        const daysFormatted = days.toString().padStart(2, '0');
        const timeFormatted = time.substr(11, 8); // Extract time part HH:MM:SS
    
        return `${daysFormatted}:${timeFormatted}`;
    }
}

module.exports = new Formatting();