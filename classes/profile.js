const { GuildMember, User, MessageEmbed } = require("discord.js");

const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const retoEmojis = require('../data/retoEmojis');

const Personalisation = require('./personalisation');
const I18n = require("../classes/i18n");

module.exports = class Profile {

    static async fetchProfileEmbed(author, member, instance, interaction) {
        // Debugging
        const startUp = new Date();

        if (author == null) return;

        const user = author instanceof GuildMember ? author.user : author
        const username = author instanceof GuildMember ? author.nickname : author.username
        
		const userDatabase = await userSchema.findOne(
			{ userId: user.id },
		).exec()
        let memberDatabase;

        const globalKarma = userDatabase && userDatabase.globalKarma != undefined ? userDatabase.globalKarma : "0"

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

        const globalRank = await userSchema.findOne({
            globalKarma: { $gt: userDatabase.globalKarma }
        }).count();
        
        embed.fields.push({
            "name": "__" + await I18n.translate("RANK", instance, null, interaction) + "__",
            "value": "** **",
            "inline": false
        },
        {
            "name": '🌐 ' + await I18n.translate("GLOBAL_RANK", instance, null, interaction),
            "value": "```" + globalRank + "```",
            "inline": true
        })
        
        if (member.guild) {
            const localRank = await memberSchema.findOne({
                karma: { $gt: memberDatabase.karma }
            }).count();

            embed.fields.push({
                "name": '✨ ' + member.guild.name + " " + await I18n.translate("RANK", instance, null, interaction),
                "value": "```" + localRank + "```",
                "inline": true
            })
        }

        // Badges
        
        // TO-DO: Add
        // - badges
        
        console.log(new Date().getTime() / 1000 - startUp.getTime() / 1000 + "ms.")

        return embed
    }
}