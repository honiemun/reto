const { GuildMember, User, EmbedBuilder } = require("discord.js");

const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const retoEmojis = require('../data/retoEmojis');

const Personalisation = require('./personalisation');
const I18n = require("../classes/i18n");

class Profile {

    constructor() {
        if (Profile._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Profile._instance = this;
    }

    async fetchProfileEmbed(author, member, instance, interaction) {
        if (author == null) return;

        const user = author instanceof GuildMember ? author.user : author
        const username = author instanceof GuildMember ? author.nickname : author.username
        
		const userDatabase = await userSchema.findOne(
			{ userId: user.id },
		).exec()
        let memberDatabase;

        const globalKarma = userDatabase && userDatabase.globalKarma != undefined ? userDatabase.globalKarma : "0"

        // Karma totals
        
        let embed = {
            "title": username,
            "description": '`' + user.username + '#' + user.discriminator + '`',
            "thumbnail": {
                "url":  user.avatarURL({ format: "png" })
            },
            "fields": [
                {
                    "name": "__" + await I18n.translate("KARMA", instance, null, interaction) + "__",
                    "value": "** **",
                    "inline": false
                },
                {
                    "name": retoEmojis.karmaEmoji + " " + await I18n.translate("GLOBAL_KARMA", instance, null, interaction),
                    "value": '```' + globalKarma + '```',
                    "inline": true
                }
            ]
        }

        if (member.guild) {
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
            "name": "__" + await I18n.translate("RANK", instance, null, interaction) + "__",
            "value": "** **",
            "inline": false
        },
        {
            "name": '🌐 ' + await I18n.translate("GLOBAL_RANK", instance, null, interaction),
            "value": "```" + userRank + "```",
            "inline": true
        })
        
        let memberRank = 0;
        if (member.guild) {
            memberRank =  await this.getRank(memberSchema, memberDatabase, "karma");

            embed.fields.push({
                "name": '✨ ' + member.guild.name + " " + await I18n.translate("RANK", instance, null, interaction),
                "value": "```" + memberRank + "```",
                "inline": true
            })
        }

        // Badges

        embed.fields.push({
            "name": "__" + await I18n.translate("BADGES", instance, null, interaction) + "__",
            "value": "** **",
            "inline": false
        })
        
        console.log(JSON.parse(process.env.BOT_OWNERS));
        if (JSON.parse(process.env.BOT_OWNERS).includes(user.id)) { embed.fields.push(await this.getProgrammerBadge(instance, interaction)); }
        if (userRank <= 10) { embed.fields.push(await this.getMedalBadge(userRank, instance, interaction)); }
        if (memberRank <= 10) { embed.fields.push(await this.getMedalBadge(memberRank, instance, interaction, member.guild.name)); }
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
            "name": "🧑‍💻 " + await I18n.translate("PROGRAMMER", instance, null, interaction),
            "value": "> " + await I18n.translate("PROGRAMMER_DESCRIPTION", instance, null, interaction),
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
                name = await I18n.translate("THIRD_PLACE_MEDALLIST", instance, null, interaction),
                description = await I18n.translate("THIRD_PLACE_MEDALLIST_DESCRIPTION", instance, null, interaction)
                break;
            case 2:
                badge = "🥈";
                name = await I18n.translate("SECOND_PLACE_MEDALLIST", instance, null, interaction),
                description = await I18n.translate("SECOND_PLACE_MEDALLIST_DESCRIPTION", instance, null, interaction)
                break;
            case 1:
                badge = "🥇";
                name = await I18n.translate("FIRST_PLACE_MEDALLIST", instance, null, interaction),
                description = await I18n.translate("FIRST_PLACE_MEDALLIST_DESCRIPTION", instance, null, interaction)
                break;
            default:
                badge = "🏅";
                name = await I18n.translate("MEDALLIST", instance, null, interaction),
                description = await I18n.translate("MEDALLIST_DESCRIPTION", instance, null, interaction)
                break;
        }

        serverName = serverName + " "

        return {
            "name": badge + " " + serverName + name,
            "value": "> " + description,
            "inline": false
        }
    }

    async getEarlySupporterBadge (instance, interaction) {
        return {
            "name": "<:retoclassic:1093680765637775371> " + await I18n.translate("EARLY_SUPPORTER", instance, null, interaction),
            "value": "> " +  await I18n.translate("EARLY_SUPPORTER_DESCRIPTION", instance, null, interaction),
            "inline": false
        }
    }
}

module.exports = new Profile();