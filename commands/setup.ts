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

		var plus = '👍'
		var minus = '👎'
		
		const row = new MessageActionRow()
			.addComponents(
				// Classic PLUS and MINUS
				new MessageButton()
					.setCustomId('classicEmojis')
					.setEmoji('911308508891336715')
					.setLabel('Classic')
					.setStyle('PRIMARY'),
				// Native :+1: and :-1:
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
					// this doesnt work obviously bc it thinks its a local variable
					// NO YOU DIPSHIT IT ISNT
					// cant be arsed to find the syntax
					// in an ideal world this code would be wrapped in a function, and i could just return the values i need
					// unfortunately discord.js shits the bed and pisses and cums whenever i try to do that inside a collector.on
					plus = '911308508891336715'
					minus = '911308510388707358'

				case 'nativeEmojis':
					plus = '👍'
					minus = '👎'
			}
		})
		
		// upsert the guild database
		// dont mind the usage of plus and minus im just testing, havent figured out how i wanna structure this yet
		await guildSchema.findOneAndUpdate({ guildId: guild?.id }, {
			guildId: guild?.id,
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