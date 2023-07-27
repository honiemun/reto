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

	async createEmbed (id, msgInt, channel, member, client) {
		if (!embeds) return;

		// Find the setup assigned with the sent ID
		const currentSetup = embeds.find(x => x.id === id);
		if (!currentSetup) return;
		
		// Setup default colour
		// TO-DO: Custom colours
		currentSetup.embed.color = 0xff00a2;

		// Create the embed we're sending
		let replyEmbed = {
			embeds: [currentSetup.embed],
			components: []
		}

		// Add components if they exist
		if (currentSetup.components) {
			await this.createComponents(currentSetup.components).then(function(component) {
				replyEmbed.components.push(component);
			});
		}

		if (currentSetup.selector) {
			await this.createSelector(currentSetup.selector, channel, client).then(function(selector) {
				replyEmbed.components.push(selector);
			});
		}

		// Send the embed
		msgInt.replied
			? msgInt.editReply(replyEmbed).then(() => { this.createCollector(currentSetup, msgInt, channel, member, client); })
			: msgInt.reply(replyEmbed).then(() => { this.createCollector(currentSetup, msgInt, channel, member, client); });
	}

	async createComponents (components) {

		// Create action components
		let actionComponents = []
		for (let component of components) {
			let buttonBuilder = new ButtonBuilder()
				.setStyle(component.style)
				.setDisabled(component.disabled ? component.disabled : false);

			if (component.emoji) buttonBuilder.setEmoji(component.emoji);
			if (component.label) buttonBuilder.setLabel(component.label);

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

	async createSelector (selector, channel, client) {
		const select = new StringSelectMenuBuilder()
			.setCustomId(selector.id)
			.setPlaceholder(selector.placeholder);
		
		const options = await this.getSelectorOptions(selector, channel, client);

		for (const option of options) {
			let optionBuilder = new StringSelectMenuOptionBuilder()
				.setLabel(option.label)
				.setValue(option.value);
			
			if (option.emoji) optionBuilder.setEmoji(option.emoji);
			
			select.addOptions(optionBuilder);
		}

		// Dynamic population
		
		return new ActionRowBuilder().addComponents(select);
	}

	async getSelectorOptions (selector, channel, client) {
		let options = selector.options;
		
		if (selector.populate) {
			const populator = selector.populate(client, channel.guild.id)

			for (const option of populator) {
				options.push(option);
			}
		}
		
		return options;
	}

	async createCollector (currentSetup, msgInt, channel, member, client) {
		// Create a collector
		if (!currentSetup.components) return;

		const collector = msgInt.channel?.createMessageComponentCollector({
			max: 1,
			time: 1000 * 60,
		})

		// Add a listener to the collector
		collector?.on('collect', async (i) => {
			// Remove previous info
			i.deferUpdate();
			msgInt.editReply({ components: [] });
			collector.stop();

			// Buttons (components)
			for (let component of currentSetup.components) {
				if (component.id === i.customId) {
					await this.selectCollectorOption(component, msgInt, channel, member, client);
					return;
				}
			}

			// Select Menu (selectors)
			if (currentSetup.selector) {
				const options = await this.getSelectorOptions(currentSetup.selector, channel, client);
				
				for (let option of options) {
					if (option.value === i.values[0]) {
						await this.selectCollectorOption(option, msgInt, channel, member, client);
						return;
					}
				}
			}
		})

		// On collector end, remove all buttons
		collector?.on('end', (collected, reason) => {
			msgInt.editReply({ components: [] });
		});
	}

	async selectCollectorOption(component, msgInt, channel, member, client) {
		// Create the next step
		component.next ? this.createEmbed(component.next, msgInt, channel, member, client) : this.createEmbed(component.id, msgInt, channel, member, client);
		// Execute function
		if (component.function) component.function(channel.guild, member);
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