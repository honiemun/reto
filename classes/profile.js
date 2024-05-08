const { GuildMember, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

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

    async fetchProfile(author, member, instance, interaction, hasBadges) {
        console.log(hasBadges);
        const embed = await this.fetchProfileEmbed(author, member, instance, interaction, hasBadges);
        
        // TO-DO: Hide button if there's no badges
        const badgeButton = new ButtonBuilder()
            .setLabel(hasBadges ? "Hide Badges" : "Show Badges")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(hasBadges ? "hide" : "show");
        
        const profileEmbed = await interaction.editReply({
            embeds: [ embed ],
            components: [ new ActionRowBuilder().addComponents(badgeButton) ],
            fetchReply: true
        });
        
        // Create collector (Badge toggle)
		const time = 1000 * 60 * 30; // 30 minutes
        const collector = profileEmbed.createMessageComponentCollector({ max: 1, time });

		collector.on('collect', async i => {
            i.deferUpdate();
            await this.fetchProfile(author, member, instance, interaction, i.customId === "show");
		});
    }

    async fetchProfileEmbed(author, member, instance, interaction, hasBadges) {
        if (author == null) return;

        const isOnGuild = interaction.guild;
        const isAuthorOrUser = author instanceof GuildMember;
        const user = isAuthorOrUser ? author.user : author;
        const username = isAuthorOrUser ? author.nickname || author.user.globalName : author.globalName;
        
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
        if (hasBadges) {
            const badges = await this.getFullBadgeView(member, user, username, userDatabase, instance, interaction, globalRanking, localRanking, isOnGuild);
            for (const badge of badges) { embed.fields.push(badge); }
        } else {
            const badges = await this.getBadges(member, user, userDatabase, instance, interaction, globalRanking, localRanking, isOnGuild);
            if (badges.length) {
                embed.fields.push({
                    "name": "Badges",
                    "value": badges.join(""),
                    "inline": false
                })
            }
        }
        return embed
    }

    // TO-DO: Split all this logic into its own Badges function!
    async getBadges (member, user, userDatabase, instance, interaction, globalRanking, localRanking, isOnGuild) {
        let badges = [];

        if (JSON.parse(process.env.BOT_OWNERS).includes(user.id)) badges.push("🧑‍💻");

        if (globalRanking <= 10) {
            const globalMedal = await this.getMedalBadge(globalRanking, instance, interaction, "", true);
            badges.push(globalMedal.name);
        }
        if (isOnGuild && localRanking <= 10) {
            const localMedal = await this.getMedalBadge(globalRanking, instance, interaction, member.guild.name, true);
            badges.push(localMedal.name);
        }

        if (userDatabase.earlySupporter) badges.push("<:retoclassic:1093680765637775371>");

        return badges;
    }

    async getFullBadgeView (member, user, username, userDatabase, instance, interaction, globalRanking, localRanking, isOnGuild) {
        let embed = [];

        embed.push({
            "name": "Badges",
            "value": "** **",
            "inline": false
        })
        
        if (JSON.parse(process.env.BOT_OWNERS).includes(user.id)) embed.push(await this.getProgrammerBadge(instance, interaction));
        if (globalRanking <= 10) embed.push(await this.getMedalBadge(globalRanking, instance, interaction));
        if (isOnGuild && localRanking <= 10) embed.push(await this.getMedalBadge(localRanking, instance, interaction, member.guild.name));
        if (userDatabase.earlySupporter) embed.push(await this.getEarlySupporterBadge(instance, interaction));

        // If no badges, return some dummy text
        if (embed.length == 1) {
            embed[0].value = "> _Looks like " + username + " doesn't have any badges yet!_";
        }

        return embed;
    }

    async getProgrammerBadge (instance, interaction) {
        return {
            "name": "🧑‍💻 Programmer",
            "value": "> One of the developers of Reto!",
            "inline": false
        }
    }

    async getMedalBadge (rank, instance, interaction, serverName = "", emoji = false) {
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
            "name": emoji ? badge : badge + " " + serverName + " " + name,
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