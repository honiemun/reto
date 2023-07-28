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

        const isOnGuild = author instanceof GuildMember;
        const user = isOnGuild ? author.user : author
        const username = isOnGuild ? author.nickname : author.username
        
		const userDatabase = await userSchema.findOne(
			{ userId: user.id },
		).exec()
        let memberDatabase;

        const globalKarma = userDatabase && userDatabase.globalKarma != undefined ? userDatabase.globalKarma : "0"

        // Karma totals
        
        let embed = {
            "title": username,
            "description": '`' + user.username + '`',
            "thumbnail": {
                "url":  user.avatarURL({ format: "png" })
            },
            "fields": [
                {
                    "name": "*Karma*",
                    "value": "** **",
                    "inline": false
                },
                {
                    "name": retoEmojis.karmaEmoji + " Global Karma",
                    "value": '```' + globalKarma + '```',
                    "inline": true
                }
            ]
        }

        if (isOnGuild) {
            // Get info from guild

            memberDatabase = await memberSchema.findOne(
                { userId: user.id, guildId: member.guild.id },
            ).exec()

            const guildKarmaData = await Personalisation.getGuildKarmaData(member.guild)
            const localKarma = memberDatabase && memberDatabase.karma != undefined ? memberDatabase.karma : "0"
            
            embed.fields.push({
                "name": guildKarmaData.emoji + ' ' + guildKarmaData.name,
                "value": "```" + localKarma + "```",
                "inline": true
            })
        }

        // Rankings
        const userRank = await this.getRank(userSchema, userDatabase, "globalKarma");
        embed.fields.push({
            "name": "*Rank*",
            "value": "** **",
            "inline": false
        },
        {
            "name": '🌐 Global Rank',
            "value": "```" + userRank + "```",
            "inline": true
        })
        
        let memberRank = 0;
        if (isOnGuild) {
            memberRank =  await this.getRank(memberSchema, memberDatabase, "karma");

            embed.fields.push({
                "name": '✨ ' + member.guild.name + " Rank",
                "value": "```" + memberRank + "```",
                "inline": true
            })
        }

        // Badges

        embed.fields.push({
            "name": "*Badges*",
            "value": "** **",
            "inline": false
        })
        
        console.log(JSON.parse(process.env.BOT_OWNERS));
        if (JSON.parse(process.env.BOT_OWNERS).includes(user.id)) { embed.fields.push(await this.getProgrammerBadge(instance, interaction)); }
        if (userRank <= 10) { embed.fields.push(await this.getMedalBadge(userRank, instance, interaction)); }
        if (isOnGuild && memberRank <= 10) { embed.fields.push(await this.getMedalBadge(memberRank, instance, interaction, member.guild.name)); }
        if (userDatabase.earlySupporter) { embed.fields.push(await this.getEarlySupporterBadge(instance, interaction)); }

        return embed
    }

    async getRank (schema, database, karma) {
        let toFind = {}
        toFind[karma] = { $gt: database[karma] }
        const ranking = await schema.findOne(toFind).count();
        return ranking + 1; // Arrays start at 0
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