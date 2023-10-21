const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder,
		StringSelectMenuOptionBuilder, ComponentType, ModalBuilder, TextInputBuilder,
		TextInputStyle, Events, ButtonStyle } = require('discord.js');

// Classes
const Validation = require("../classes/validation");

// Data
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
			? await msgInt.editReply(replyEmbed).then(() => { this.createCollector(currentSetup, msgInt, channel, member, client); })
			: await msgInt.reply(replyEmbed).then(() => { this.createCollector(currentSetup, msgInt, channel, member, client); });
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
		
		if (selector.minValues) select.setMinValues(selector.minValues);
		if (selector.maxValues) select.setMaxValues(selector.maxValues);
		
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
			// Buttons (components)
			for (let component of currentSetup.components) {
				if (component.id === i.customId) {
					// Modals
					if (component.modal) {
						await this.createModal(component.modal, i, msgInt, channel, member, client);
						return;
					}

					await this.selectCollectorOption(component, i, currentSetup, msgInt, channel, member, client);
					return;
				}
			}

			// Select Menu (selectors)
			if (currentSetup.selector) {
				const options = await this.getSelectorOptions(currentSetup.selector, channel, client);
				
				for (let option of options) {
					// TO-DO: Should actually be various values?
					if (option.value === i.values[0]) {
						await this.selectCollectorOption(option, i, currentSetup, msgInt, channel, member, client);
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

	async selectCollectorOption(component, i, currentSetup, msgInt, channel, member, client) {
		// When the update isn't deferred, we receive an error.
		i.deferUpdate();
		
		// Create the next step
		await this.nextTab(component, msgInt, channel, member, client);
		// Execute function
		if (component.function) component.function(channel.guild, member);
		// TO-DO: Should actually return a list of components and not a list of values
		if (currentSetup.selector && currentSetup.selector.function && i.values) currentSetup.selector.function(i.values, channel.guild, member);
	}

	async nextTab(component, msgInt, channel, member, client) {
		const next = component.nextFunction ? await component.nextFunction(msgInt) : component.next;
		next ?
			await this.createEmbed(next, msgInt, channel, member, client) :
			await this.createEmbed(component.id, msgInt, channel, member, client);
	}

	async createModal(modal, interaction, msgInt, channel, member, client) {
		// Generate modal
		const modalBuilder = new ModalBuilder()
			.setCustomId(modal.id)
			.setTitle(modal.title);
		
		// Generate inputs
		for (let input of modal.inputs) {
			let modalElement = new TextInputBuilder()
				.setCustomId(input.id)
				.setLabel(input.label);
			
			modal.longForm ?
			modalElement.setStyle(TextInputStyle.Paragraph) :
			modalElement.setStyle(TextInputStyle.Short);

			if (input.placeholder) modalElement.setPlaceholder(input.placeholder);
			if (input.required) modalElement.setRequired(true);

			const actionRow = new ActionRowBuilder().addComponents(modalElement);
			modalBuilder.addComponents(actionRow);
		}

		// Send modal
		await interaction.showModal(modalBuilder);

		// Await for a response
		await this.modalCollector(modal, msgInt, channel, member, client);
	}

	async modalCollector(modal, msgInt, channel, member, client) {
		client.on(Events.InteractionCreate, async interaction => {
			if (!interaction.isModalSubmit()) return;

			let inputArray = [];

			for (let input of modal.inputs) {
				const value = interaction.fields.getTextInputValue(input.id);
				const validation = await this.validateModalInput(input, value);

				// Retry if the validation fails
				if (validation) {
					await this.generateModalRetry(modal, validation, interaction, msgInt, channel, member, client)
					return;
				}

				inputArray.push(value);
			}

			if (interaction.customId === modal.id) {
				interaction.deferUpdate(); // Hacky way to go about this!
				await this.nextTab(modal, msgInt, channel, member, client);
			}

			// TO-DO: Execute function
		});		
	}

	async validateModalInput(input, value) {
		// False means it passes validation.
		if (!input.validation) return false;

		switch (input.validation) {
			case "number":
				if (isNaN(value)) return await this.createErrorEmbed("The `" + input.label + "` element is not a number.");
				break;
			/*
			// We can't really write emoji on a modal
			// Discord summoning 10000 unnamed developers
			// to create the most pointless restrictions
			case "emoji":
				return await Validation.validateEmoji(value);
				break;
			*/
			default:
				return false;
				break;
		}
	}

	async generateModalRetry(modal, validation, interaction, msgInt, channel, member, client) {
		// Create retry button
		const retry = new ButtonBuilder()
		.setLabel("Retry")
		.setStyle(ButtonStyle.Primary)
		.setCustomId("retry");
		
		// Send error embed
		interaction.reply({
			embeds: [ validation ], components: [ new ActionRowBuilder().addComponents(retry) ]
		})

		// Create collector
		const collector = interaction.channel?.createMessageComponentCollector({
			max: 1,
			time: 1000 * 60,
		})

		// Add a listener to the collector
		collector?.on('collect', async (i) => {
			await this.createModal(modal, i, msgInt, channel, member, client);
			return;
		})

		// On collector end, remove all buttons
		collector?.on('end', (collected, reason) => {
			interaction.editReply({ components: [] });
		});
	}
	
    async createErrorEmbed(reason) {
        const date = new Date();
		const randomErrorMessage = [
			"Something went wrong!",
			"Looks like something broke!",
			"We've found an error...",
			"There's been a problem!",
			"Sorry, an error has ocurred...",
			"Dead Reto, oops!",
			"Try plugging it off then on again?",
			"Guru Meditation",
			"That's not supposed to happen..."
		];

        return new EmbedBuilder()
            .setColor("Red")
            .setTitle("⚠️ " + randomErrorMessage[Math.floor(Math.random()*randomErrorMessage.length)])
            .setDescription(reason)
            .setFooter({text: date.getHours() + ":" + date.getMinutes() + " • " + date.toLocaleDateString('en-US') });
    }

	// TO-DO: Phase out, where possible, with an Autocomplete. See Autoreact.
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

	async createAutoreactTypeSelectorEmbed(interaction) {
		const channel = interaction.options.getChannel("channel");

		const select = new StringSelectMenuBuilder()
			.setCustomId('selectedAutoreact')
			.setPlaceholder('Select the type of message')
			.setMinValues(1)
			.setMaxValues(4);

		select.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel("Text")
				.setDescription("Text-only messages.")
				.setValue("text"),
			new StringSelectMenuOptionBuilder()
				.setLabel("Media")
				.setDescription("Messages that include images, video or audio.")
				.setValue("media"),
			new StringSelectMenuOptionBuilder()
				.setLabel("File")
				.setDescription("Messages that have any other type of file attached.")
				.setValue("file"),
			new StringSelectMenuOptionBuilder()
				.setLabel("Embed")
				.setDescription("Messages that include an embed or a link with preview.")
				.setValue("embed"),
		);

		const row = new ActionRowBuilder()
			.addComponents(select);

        const reactableSelect = await interaction.editReply({ embeds: [
			new EmbedBuilder()
				.setColor("Yellow")
				.setTitle("Types of content")
				.setDescription("The bot will autoreact to any messages that include certain types of content on <#" + channel + ">.\nPlease select which types of content will trigger the auto-reaction.")
		], components: [ row ] })


		return reactableSelect.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });
	}

	async createDefaultEmojiSelectorEmbed(interaction, reactable,reactableName) {
		const select = new StringSelectMenuBuilder()
			.setCustomId('selectedAutoreact')
			.setPlaceholder('Select the default emoji for ' + reactableName)

		for (const emojiId of reactable.emojiIds) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("Emoji")
					.setEmoji(emojiId)
					.setValue(emojiId)
			);
		}

		const row = new ActionRowBuilder()
			.addComponents(select);

        const emojiSelect = await interaction.editReply({ embeds: [
			new EmbedBuilder()
				.setColor("Yellow")
				.setTitle("Default Emoji")
				.setDescription("Which emoji will become the Default Emoji for the **" + reactableName + "**?")
		], components: [ row ] })


		return emojiSelect.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });
	}
}

module.exports = new Embed();