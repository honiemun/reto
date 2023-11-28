// Dependencies
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('@discordjs/builders');

// Classes
const Personalisation = require("../classes/personalisation");

// Schemas
const userSchema = require('../schemas/member');
const memberSchema = require('../schemas/member');

// Data
const retoEmojis = require('../data/retoEmojis');
const brandingColors = require('../data/brandingColors');

class Ranking {
    
    constructor() {
        if (Ranking._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Ranking._instance = this;
    }

    async leaderboard(type, interaction, member, client) {
        const typeIsGlobal = type === 'global';

        const rankingData = await this.getRankingData(type, member);

        await this.createLeaderboardEmbed(rankingData, interaction, client, typeIsGlobal, 1);
    }

    async createLeaderboardEmbed(rankingData, interaction, client, typeIsGlobal, page) {

        const rankings = await this.filterRankingByRange(rankingData, page);
        const pageLength = await this.getPageFromLength(rankingData);

        const karmaData = !typeIsGlobal ? await Personalisation.getGuildKarmaData(interaction.guild) : { emoji: retoEmojis.karmaEmoji, name: "Karma" };
        const leaderboardName = typeIsGlobal ? 'Leaderboard' : interaction.guild.name + ' Leaderboard';
        
        let rankingNumber = "";
        let rankingUsername = "";
        let rankingKarma = "";
        
        if (rankings.length === 0) return await this.getEmptyLeaderboard(interaction);

        // Generate fields
        for (let ranking of rankings) {
            const user = await this.fetchUserById(ranking.userId, client);
            let username = user.globalName || user.username;
            if (!username) username = "Unknown"

            rankingNumber   += "`" + ranking.ranking + "`\n";
            rankingUsername += "`" + username + "`\n";
            rankingKarma    += karmaData.emoji + " `" + ranking.karma + "`\n";
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(leaderboardName)
            .setDescription('** **')
            .setColor(brandingColors.brightPink)
            .addFields(
                {
                    name: 'No.',
                    value: rankingNumber,
                    inline: true
                },
                {
                    name: 'Username',
                    value: rankingUsername,
                    inline: true
                },
                {
                    name: 'Karma',
                    value: rankingKarma,
                    inline: true
                }
            )
            .setFooter({
                text: 'Page ' + page + '/' + pageLength
            });
        
        const row = await this.createButtonRow(page, pageLength);

        const message = await interaction.editReply({ embeds: [embed], components: [row]});
        await this.createLeaderboardCollector(rankingData, interaction, message, embed, client, typeIsGlobal, page, pageLength);
    }

    async createButtonRow(page, pageLength) {
        const row = new ActionRowBuilder()

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('prev_leader')
                .setStyle('Secondary')
                .setLabel('⬅️')
                .setDisabled(page <= 1)
                // TO-DO: Emoji HATES Me
                //.setEmoji('⬅')
        );
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('next_leader')
                .setStyle('Secondary')
                .setLabel('➡️')
                .setDisabled(page >= pageLength)
                //.setEmoji('➡')
        );

        return row;
    }

    async createLeaderboardCollector(rankingData, interaction, message, embed, client, typeIsGlobal, page, pageLength) {

		const filter = (i) => ['prev_leader', 'next_leader'].includes(i.customId) && i.user.id === interaction.user.id;
		const time = 1000 * 60 * 5;
        const collector = message.createMessageComponentCollector({ filter, max: 1, time });

        // Handle collections
        collector.on('collect', async (newInt) => {

			if (!newInt) return;
			await newInt.deferUpdate();
            
			if (newInt.customId === 'prev_leader' && page > 0) {
				page -= 1;
			} else if (newInt.customId === 'next_leader' && page < pageLength) {
				page += 1;
			}

            // Loading message
            await embed.setDescription(retoEmojis.loadingEmoji + " Loading page " + page + "...");
            await interaction.editReply({ embeds: [embed] });

			await this.createLeaderboardEmbed(rankingData, newInt, client, typeIsGlobal, page);
		});

		// On collector end, remove all buttons
		collector.on('end', (collected, reason) => {
			if (reason == "time") {
                interaction.editReply({ components: [] });
            }
		});
    }

    async getPageFromLength(array) {
        return Math.ceil(array.length / 10);
    }

    async getRankingData(type, member) {
        const typeIsGlobal = type === 'global';
        const schema = typeIsGlobal ? userSchema : memberSchema;
        const karma = typeIsGlobal ? 'globalKarma' : 'karma';

        // Aggregation rules
        let aggregation = [];
        
        if (!typeIsGlobal) {
            aggregation.push({ $match: { guildId: member.guild.id }})
        }

        aggregation.push(
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
            }
        );

        if (typeIsGlobal) {
            aggregation.push({ $limit: 100 });
        }

        // Database call
        return await schema.aggregate(aggregation).exec();
    }

    async filterRankingByRange(rankingData, pageNumber) {
        const resultsPerPage = 10;
        const startIndex = (pageNumber - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
      
        return rankingData.slice(startIndex, endIndex);
    }

    async fetchUserById(userId, client) {
        const foundUser = client.users.cache.find(user => user.id === userId);
        return foundUser ? foundUser : await client.users.fetch(userId);
    }

    async getEmptyLeaderboard(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Leaderboard')
            .setDescription('No ranking data found.')

        const row = await this.createButtonRow(0, 0); // Both disabled!
        
        await interaction.editReply({ embeds: [embed], components: [row] });
    }
}

module.exports = new Ranking();