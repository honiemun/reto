import { ButtonInteraction, CacheType, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import Embed from '../classes/embed';
import { ICommand } from "wokcommands";

// Schemas
import guildSchema from '../schemas/guild';

export default {
	category: 'Configuration',
	description: 'Creates all necessary roles, emoji, and channels for the bot to function.',

	slash: 'both',
	testOnly: true, // This only works for test servers!

	callback: async ({ interaction: msgInt, channel, guild }) => {

		Embed.createEmbed('setupType', msgInt, channel);

		/*
		// Create buttons for message
		const row = new MessageActionRow()
			.addComponents(
				// Quick setup
				new MessageButton()
					.setCustomId('quickSetup')
					.setLabel('Quick setup')
					.setStyle('PRIMARY'),
				// Advanced setup
				new MessageButton()
					.setCustomId('advancedSetup')
					.setLabel('Advanced setup')
					.setStyle('SECONDARY')
					.setDisabled(true)
			)

		msgInt.reply({
			embeds: [
			new MessageEmbed()
				.setColor(0xff00a2) // TO-DO: Store this somewhere
				.setTitle("Welcome to Reto's setup wizard!")
				.setDescription("To get started, pick out what kind of setup process you'd like.")
				.addFields(
					{ name: 'Quick setup', value: 'The one most people will need.\nThis will create for you:\n\n★ A <:plus:1004190494844264509> **plus** and <:minus:1004190495964139540> **minus** emoji. Anyone can vote on their favourite messages with these!\n★ A <:10:1004190492650647594> **bestof** emoji that will send whatever post is reacted to it to a new \`#best-of\` channel.\n★ A \`@Curator\` role - people with this role can use the **bestof** emoji to send messages to the \`#best-of\` channel.\n★ Sets the server as Public, meaning the funniest messages can be discovered with \`/explore\`.\n★ Sets up confirmations as a Reaction.\n\n*(All these features can be modified later down the line.)*', inline: true },
					{ name: 'Advanced setup', value: "Want to customise Reto to the fullest?\nUse the Advanced wizard to make the bot your own!\n\n★ Choose if you want the default **+1** and/or **-1** Reactables.\n★ Create an optional \`#best-of\` channel, and send messages to it using an exclusive emoji or Democracy Mode *(a message vote threshold).*\n★ Create your own server-specific Reactables!\n★ Choose if you'd like your server's messages to remain Public or Private.\n★ Send a confirmation message or reaction each time someone uses a Reactable.\n\n*(This is currently in development.)*", inline: true }
				)
			],
			components: [row]
		})

		
		const collector = channel.createMessageComponentCollector({
			max: 1,
			time: 1000 * 15,
		})

		collector.on('collect', (i: ButtonInteraction) => {
			switch (i.customId) {
				case 'quickSetup':
					i.reply({
						content: 'Okay cool logic goes here',
						ephemeral: true
					});
					break;
				case 'advancedSetup':
					i.reply({
						content: 'This feature is currently in development.',
						ephemeral: true
					});
					break;
			}
		})
		
		/*
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
		})*/
		/*
		Useless, shitty code.
		May re-use some of this

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
			reactionConfirmation: "Reaction",
			reactables: [
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
			
		}, { upsert: true });*/
	},
} as ICommand