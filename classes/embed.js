const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const Setup = require('./setup');
const embeds = require('../data/embeds');

class Embed {

    constructor() {
        if (Embed._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Embed._instance = this;
    }

	async createEmbed (id, msgInt, channel, member) {
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

	async createComponents (components) {

		// Create action components
		let actionComponents = []
		for (let component of components) {
			actionComponents.push(new ButtonBuilder()
				.setCustomId(component.url ? "" : component.id)
				.setLabel(component.label)
				.setStyle(component.style)
				.setDisabled(component.disabled ? component.disabled : false)
				.setURL(component.url ? component.url : false)
			);
		}
		
		// TO-DO: Support multiple rows
		return new ActionRowBuilder().addComponents(actionComponents)

	}

	async createCollector (currentSetup, msgInt, channel, member) {
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

    async createErrorEmbed(reason) {
        const date = new Date();
		const randomErrorMessage = [
			"Something went wrong!",
			"We've found an error...",
			"There's been a problem!",
			"Sorry, an error has ocurred...",
			"Dead Reto, oops!",
			"Try plugging it off then on again?",
			"Guru Meditation"
		];

        return new EmbedBuilder()
            .setColor("RED")
            .setTitle("⚠️ " + randomErrorMessage[Math.floor(Math.random()*randomErrorMessage.length)])
            .setDescription(reason)
            .setFooter({text: date.toString() });
    }
}

module.exports = new Embed();