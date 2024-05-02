const { GuildMember, User, EmbedBuilder } = require("discord.js");

const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const retoEmojis = require('../data/retoEmojis');

const Personalisation = require('./personalisation');

class Profile {

    constructor() {
        if (Profile._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Profile._instance = this;
    }

    async fetchProfileEmbed(author, member, instance, interaction) {
        if (author == null) return;

        const isOnGuild = interaction.guild;
        const isAuthorOrUser = author instanceof GuildMember;
        const user = isAuthorOrUser ? author.user : author
        const username = isAuthorOrUser ? author.nickname : author.username
        
		const userQuery = await userSchema.aggregate([
            {
                $setWindowFields: {
                    partitionBy: "$state",
                    sortBy: { globalKarma: -1 },
                    output: {
                        ranking: {
                            $rank: {}
                        }
                    }
                }
            },
            { $match: { userId: user.id }},
            { $limit: 1 }
		]).exec();
        const userDatabase = userQuery[0];
        let memberDatabase;

        let localRanking;
        let globalRanking;

        const globalKarma = userDatabase && userDatabase.globalKarma != undefined ? userDatabase.globalKarma : "0"

        // Karma totals
        
        let embed = {
            "title": username,
            "description": '`@' + user.username + '`',
            "thumbnail": {
                "url":  user.avatarURL({ format: "png" })
            },
            "fields": [
                {
                    "name": "Karma",
                    "value": "** **",
                    "inline": false
                }
            ]
        }

        // If the user hasn't used Reto before, kick 'em out!
        if (!userDatabase) {
            embed.fields.push({
                "name": "***Looks like you're new to Reto!***",
                "value": "You don't have any Karma just yet - use `/guide` to get started, react to others' messages, and enjoy your stay on the server!",
                "inline": false
            })

            return embed;
        }

        if (isOnGuild) {
            // Get info from guild
            const memberQuery = await memberSchema.aggregate([
                { $match: { guildId: member.guild.id }},
                {
                    $setWindowFields: {
                        partitionBy: "$state",
                        sortBy: { karma: -1 },
                        output: {
                            ranking: {
                                $rank: {}
                            }
                        }
                    }
                },
                { $match: { userId: user.id }},
                { $limit: 1 }
            ]).exec();
            memberDatabase = memberQuery[0];

            const guildKarmaData = await Personalisation.getGuildKarmaData(member.guild)
            const localKarma = memberDatabase && memberDatabase.karma != undefined ? memberDatabase.karma : "0"
            
            // Guild Karma
            embed.fields.push({
                "name": guildKarmaData.emoji + ' ' + guildKarmaData.name,
                "value": "```" + localKarma + "```",
                "inline": true
            })
        }

        embed.fields.push({
                "name": retoEmojis.karmaEmoji + " Global Karma",
                "value": '```' + globalKarma + '```',
                "inline": true
        })

        // Rankings
        globalRanking = userDatabase && userDatabase.ranking != undefined ? userDatabase.ranking : "N/A"
        embed.fields.push({
            "name": "Rank",
            "value": "** **",
            "inline": false
        })
        
        // Guild Rank
        if (isOnGuild) {
            localRanking = memberDatabase && memberDatabase.ranking != undefined ? memberDatabase.ranking : "N/A"
            embed.fields.push({
                "name": '✨ ' + member.guild.name + " Rank",
                "value": "```" + localRanking + "```",
                "inline": true
            })
        }

        // Global Rank
        embed.fields.push({
            "name": '🌐 Global Rank',
            "value": "```" + globalRanking + "```",
            "inline": true
        })

        // Badges

        embed.fields.push({
            "name": "Badges",
            "value": "** **",
            "inline": false
        })
        
        if (JSON.parse(process.env.BOT_OWNERS).includes(user.id)) { embed.fields.push(await this.getProgrammerBadge(instance, interaction)); }
        if (globalRanking <= 10) { embed.fields.push(await this.getMedalBadge(globalRanking, instance, interaction)); }
        if (isOnGuild && localRanking <= 10) { embed.fields.push(await this.getMedalBadge(localRanking, instance, interaction, member.guild.name)); }
        if (userDatabase.earlySupporter) { embed.fields.push(await this.getEarlySupporterBadge(instance, interaction)); }

        return embed
    }

    async getProgrammerBadge (instance, interaction) {
        return {
            "name": "🧑‍💻 Programmer",
            "value": "> One of the developers of Reto!",
            "inline": false
        }
    }

    async getMedalBadge (rank, instance, interaction, serverName = "") {
        let badge;
        let name;
        let description;
        
        switch (rank) {
            case 3:
                badge = "🥉";
                name = "Third Place Medallist";
                break;
            case 2:
                badge = "🥈";
                name = "Second Place Medallist";
                break;
            case 1:
                badge = "🥇";
                name = "First Place Medallist";
                break;
            default:
                badge = "🏅";
                name = "Medallist";
                break;
        }

        const serverNameDescription = serverName ? serverName + "'s " : "the global ";
        description = "For ranking no. " + rank + " on " + serverNameDescription + "leaderboard!"

        return {
            "name": badge + " " + serverName + " " + name,
            "value": "> " + description,
            "inline": false
        }
    }

    async getEarlySupporterBadge (instance, interaction) {
        return {
            "name": "<:retoclassic:1093680765637775371> Early Supporter",
            "value": "> Thank you for being a part of Reto Legacy!",
            "inline": false
        }
    }
}

module.exports = new Profile();