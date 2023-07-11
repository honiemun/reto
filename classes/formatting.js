//const { CommandInteraction, Message } = require('discord.js');

class Formatting {

    constructor() {
        if (Formatting._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Formatting._instance = this;
    }

    async format (textToFormat, message = null, guild = null, reactable = null) {
        // const rules = this.getFormattingRules(message);
        return textToFormat;
    }

    async getFormattingRules (message, guild, reactable) {
        // TO-DO: I18n

        // Changes from Reto Legacy:
        // - u and um are now a and am, for the sake of clarity (Username is now Author).
        // - Since there can be many "pinnable" channels, b and bm are now p and pm (Best Of -> Pinnable).
        // - Points (a non existing concept) are now rk (Reactable's Karma Awarded).
        return {
            "Author": {
                "a": {
                    "name": "Author",
                    "description": "The global username of the author of the message.",
                    "format": message ? message.author.name : null
                },
                "al": {
                    "name": "Author (local)",
                    "description": "The local username (the alias they have on this server) of said author.",
                    "format": message && guild ? guild.member(message.author) : null
                },
                "am": {
                    "name": "Author (mention)",
                    "description": "A ping to said author.",
                    "format": message ? message.author.mention : null
                },
                "k": {
                    "name": "Author's Karma",
                    "description": "The amount of Karma the author has on this server.",
                    "format": null
                },
                "kg": {
                    "name": "Author's Karma (global)",
                    "description": "The amount of global Karma the author has on this server.",
                    "format": null
                }
            },
            "Reactor": {
                "r": {
                    "name": "Reactor",
                    "description": "The global username of the person who reacted to this message.",
                    "format": null
                },
                "rl": {
                    "name": "Reactor (local)",
                    "description": "The local username (the alias they have on this server) of said reactor.",
                    "format": null
                },
                "rm": {
                    "name": "Reactor (mention)",
                    "description": "A ping to said reactor.",
                    "format": null
                }
            },
            "Message": {
                "m": {
                    "name": "Message",
                    "description": "The contents of the message. (text-only)",
                    "format": message ? message.content : null
                },
                "mk": {
                    "name": "Message Karma",
                    "description": "The amount of total karma this message has.",
                    "format": null
                },
                "c": {
                    "name": "Channel",
                    "description": "The name of the channel this message has been posted on.",
                    "format": message ? message.channel : null
                },
                "cm": {
                    "name": "Channel (mention)",
                    "description": "A link to said channel.",
                    "format": message ? message.channel.mention : null
                }
            },
            "Reactable": {
                "rn": {
                    "name": "Reactable Name",
                    "description": "The name of the reactable.",
                    "format": reactable ? reactable.name : null
                },
                "rn": {
                    "name": "Reactable Emoji",
                    "description": "The emoji of the reactable.",
                    "format": reactable ? reactable.emojiIds[0] : null
                },
                "rk": {
                    "name": "Reactable's Karma Awarded",
                    "description": "The amount of karma given by this reactable.",
                    "format": reactable ? reactable.karmaAwarded : null
                },
                "p": {
                    "name": "Pinnable Channel",
                    "description": "The name of the pinnable channel that corresponds to this reactable. (For example, *best-of*).",
                    "format": reactable ? reactable.sendsToChannel : null // We need to fetch this from somewhere.
                },
                "pm": {
                    "name": "Pinnable Channel (mention)",
                    "description": "A link to said pinnable channel.",
                    "format": reactable ? reactable.sendsToChannel : null // We need to fetch this from somewhere.
                }
            },
            "Server": {
                "s": {
                    "name": "Server",
                    "description": "The name of the server the message has been sent to.",
                    "format": message ? message.guild.name : null
                },
                "kn": {
                    "name": "Karma Name",
                    "description": "The name this server uses for Karma.",
                    "format": message ? message.guild : null // Get ID, check in DB?
                },
                "ke": {
                    "name": "Karma Emoji",
                    "description": "The emoji this server uses for Karma.",
                    "format": message ? message.guild : null // Get ID, check in DB?
                }
            }
        }
    }
}

module.exports = new Formatting();