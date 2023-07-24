const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder,
		StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');
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
			let buttonBuilder = new ButtonBuilder()
				.setLabel(component.label)
				.setStyle(component.style)
				.setDisabled(component.disabled ? component.disabled : false);
			
			if (component.url) {
				buttonBuilder.setURL(component.url)
			} else {
				buttonBuilder.setCustomId(component.id)
			}

			actionComponents.push(buttonBuilder);
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
            .setColor("Red")
            .setTitle("⚠️ " + randomErrorMessage[Math.floor(Math.random()*randomErrorMessage.length)])
            .setDescription(reason)
            .setFooter({text: date.toString() });
    }

	async createReactableSelectorEmbed(interaction, reactables, includesAll, title) {
		const select = new StringSelectMenuBuilder()
			.setCustomId('selectedReactable')
			.setPlaceholder('Select a reactable');

		if (includesAll) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("All reactables") // Uppercase
					.setValue("all")
			);
		}
		
		for (const reactable of reactables) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1)) // Uppercase
					.setEmoji(reactable.emojiIds[0])
					.setValue(reactable._id.toString())
			);
		}
		
		const row = new ActionRowBuilder()
			.addComponents(select);

        const reactableSelect = await interaction.editReply({ embeds: [
			new EmbedBuilder()
				.setColor("Yellow")
				.setTitle(title)
				.setDescription("Pick a reactable from the list below!")
		], components: [ row ] })


		return reactableSelect.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });
	}
}

module.exports = new Embed();