const { GuildMember, CommandInteraction, MessageActionRow, MessageButton, MessageButtonStyleResolvable, TextChannel, ButtonInteraction } = require('discord.js');
const Setup = require('./setup');
const embeds = require('../data/embeds');

module.exports = class Embed {

	static async createEmbed (id, msgInt, channel, member) {
		if (!embeds) return;

		// Find the setup assigned with the sent ID
		const currentSetup = embeds.find(x => x.id === id);
		if (!currentSetup) return;
		
		// Setup default colour
		// TO-DO: Custom colours
		currentSetup.embed.color = 0xff00a2;

		// Create the embed we're sending
		let replyEmbed = {
			embeds: [currentSetup.embed]
		}

		// Add components if they exist
		if (currentSetup.components) {
			await this.createComponents(currentSetup.components).then(function(component) {
				replyEmbed.components = [component];
			});
		}

		// Send the embed
		msgInt.replied
			? msgInt.editReply(replyEmbed).then(() => { this.createCollector(currentSetup, msgInt, channel, member); })
			: msgInt.reply(replyEmbed).then(() => { this.createCollector(currentSetup, msgInt, channel, member); });
	}

	static async createComponents (components) {

		// Create action components
		let actionComponents = []
		for (let component of components) {
			actionComponents.push(new MessageButton()
				.setCustomId(component.url ? "" : component.id)
				.setLabel(component.label)
				.setStyle(component.style)
				.setDisabled(component.disabled ? component.disabled : false)
				.setURL(component.url ? component.url : "")
			);
		}
		
		// TO-DO: Support multiple rows
		return new MessageActionRow().addComponents(actionComponents)

	}

	static async createCollector (currentSetup, msgInt, channel, member) {
		// Create a collector
		if (!currentSetup.components) return;

		const collector = msgInt.channel?.createMessageComponentCollector({
			max: 1,
			time: 1000 * 60,
		})

		// Add a listener to the collector
		collector?.on('collect', (i) => {
			// Remove previous info
			i.deferUpdate();
			msgInt.editReply({ components: [] });
			collector.stop();

			for (let component of currentSetup.components) {
				if (component.id === i.customId) {
					// Create the next step
					component.next ? this.createEmbed(component.next, msgInt, channel, member) : this.createEmbed(component.id, msgInt, channel, member);
					// Execute function
					if (component.function) component.function(channel.guild, member);
				}
			}
		})

		// On collector end, remove all buttons
		collector?.on('end', (collected, reason) => {
			msgInt.editReply({ components: [] });
		});
	}
}