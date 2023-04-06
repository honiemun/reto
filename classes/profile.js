const { GuildMember, User, MessageEmbed } = require("discord.js");

const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const retoEmojis = require('../data/retoEmojis');

const Personalisation = require('./personalisation');
const I18n = require("../classes/i18n");

module.exports = class Profile {

    static async fetchProfileEmbed(author, member, instance, interaction) {
        if (author == null) return;

        const user = author instanceof GuildMember ? author.user : author
        const username = author instanceof GuildMember ? author.nickname : author.username
        
		const userDatabase = await userSchema.findOne(
			{ userId: user.id },
		).exec()

        const globalKarma = userDatabase && userDatabase.globalKarma != undefined ? userDatabase.globalKarma : "0"

        let embed = {
            "title": username,
            "description": '`' + user.username + '#' + user.discriminator + '`',
            "thumbnail": {
                "url":  user.avatarURL({ format: "png" })
            },
            "fields": [
                {
                    "name": retoEmojis.karmaEmoji + " " + await I18n.translate("GLOBAL_KARMA", instance, null, interaction),
                    "value": '```' + globalKarma + '```',
                    "inline": true
                }
            ]
        }

        if (member.guild) {
            // Get info from guild

            const memberDatabase = await memberSchema.findOne(
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

        // TO-DO: Add
        // - badges
        // - local rank
        // - global rank

        return embed
    }
}