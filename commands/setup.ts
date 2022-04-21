import { ButtonInteraction, CacheType, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";

// Schemas
import guildSchema from '../schemas/guild';

export default {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	slash: 'both',
	testOnly: true, // This only works for test servers!

	callback: async ({ interaction: msgInt, channel, guild }) => {

		var plus = ''
		var minus = ''
		
		const row = new MessageActionRow()
			// Classic PLUS and MINUS
			.addComponents(
				new MessageButton()
					.setCustomId('classicEmojis')
					.setEmoji('911308508891336715')
					.setLabel('Classic')
					.setStyle('PRIMARY')
			)
			// Native :+1: and :-1:
			.addComponents(
				new MessageButton()
					.setCustomId('nativeEmojis')
					.setEmoji('👍')
					.setLabel('Native')
					.setStyle('SECONDARY')
			)
		
		msgInt.reply({
			embeds: [
			new MessageEmbed()
				.setTitle('Setup (1/1)')
				.setDescription('What type of emoji do you want to use?')
			],
			components: [row]
		})

		const filter = (btnInt: ButtonInteraction) => {
			// This message is only viewable to the person that executed the command.
			return msgInt.user.id === btnInt.user.id;
		}

		const collector = channel.createMessageComponentCollector({
			max: 1,
			time: 1000 * 15,
		})

		collector.on('collect', (i: ButtonInteraction) => {
			i.reply({
				content: 'You have selected the **' + i.customId + '** emoji type.',
				ephemeral: true
			})
		})

		collector.on('end', (collection) => {
			switch (collection.first()?.customId) {
				case 'classicEmojis':
					plus = '911308508891336715'
					minus = '911308510388707358'

				case 'nativeEmojis':
					// no funca, esta TODO MAL
					plus = '👍'
					minus = '👎'
			}
		})
	
		await guildSchema.findOneAndUpdate({ guildId: guild?.id }, {
			guildId: guild?.id,
			karmaName: guild?.name + ' Karma',
			reactionables: [
				{
					// The default PLUS element.
					guildId: guild?.id,
					emojiId: plus,
					karmaAwarded: 1,
					globalKarma: true,
				},
				{
					// The default MINUS element.
					guildId: guild?.id,
					emojiId: minus,
					karmaAwarded: -1,
					globalKarma: true,
				},
			]
		}, { upsert: true });
	},
} as ICommand