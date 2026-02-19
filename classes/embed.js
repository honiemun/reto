const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder,
		StringSelectMenuOptionBuilder, ComponentType, ModalBuilder, TextInputBuilder,
		TextInputStyle, Events, ButtonStyle } = require('discord.js');

// Classes
const Validation = require("../classes/validation");
const PaginatedSelector = require("../classes/paginatedSelector");

// Data
const embeds = require('../data/embeds');
const brandingColors = require('../data/brandingColors');

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

		// Kill any paginator left over from the previous step
		if (this._activePaginator) {
			this._activePaginator.stop();
			this._activePaginator = null;
		}

		// Setup default colour
		// TO-DO: Custom colours
		currentSetup.embed.color = brandingColors.brightPink;

		// Create the embed we're sending
		let replyEmbed = {
			embeds: [currentSetup.embed],
			components: []
		}

		// Add components if they exist
		let buttonRow = null;
		if (currentSetup.components) {
			buttonRow = await this.createComponents(currentSetup.components)
			replyEmbed.components.push(buttonRow);
		}

		// Add selector if it exists
		if (currentSetup.selector) {
			replyEmbed.components.push(
				await this.buildSelectorRow(currentSetup, channel, client, msgInt, member, buttonRow)
			);
		}

		// Send the embed
		await msgInt.editReply(replyEmbed).then((embed) => {
			this.createCollector(currentSetup, embed, msgInt, channel, member, client);
		});
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

	async buildSelectorRow(currentSetup, channel, client, msgInt, member, buttonRow) {
		const allOptions = await this.getSelectorOptions(currentSetup.selector, channel, client);

		if (allOptions.length > 24) {
			const paginator = new PaginatedSelector(currentSetup.selector, allOptions);
			this._activePaginator = paginator;
			return paginator.buildPage(0);
		}

		this._activePaginator = null;
		return this.createSelector(currentSetup.selector, allOptions);
	}

	// NOTE: allOptions is now passed in directly from createEmbed (already resolved)
	// so we don't call getSelectorOptions a second time here.
	async createSelector (selector, allOptions) {
		const select = new StringSelectMenuBuilder()
			.setCustomId(selector.id)
			.setPlaceholder(selector.placeholder);
		
		if (selector.minValues) select.setMinValues(selector.minValues);
		if (selector.maxValues) select.setMaxValues(selector.maxValues);

		for (const option of allOptions) {
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
		let options = [...selector.options]; // shallow copy so we don't mutate the data file
		
		if (selector.populate) {
			const populator = selector.populate(client, channel.guild.id);
			if (populator && populator.length > 0) {
				for (const option of populator) {
					if (!options.find(o => o.value === option.value)) {
						options.push(option);
					}
				}
			}
		}
		
		return options;
	}

	async createCollector(currentSetup, embed, msgInt, channel, member, client) {
		if (!currentSetup.components) return;

		const filter = (i) => i.user.id === member.id;
		const time = 1000 * 60 * 5;

		// No max:1 — we need to stay alive for pagination
		const collector = embed.createMessageComponentCollector({ filter, time });

		collector.on('collect', async (i) => {
			if (!i) return;

			// ── Paginated select menu ──────────────────────────────────────
			if (i.isStringSelectMenu() && this._activePaginator) {
				const value = i.values?.[0];

				if (value === '__paginate_next__') {
					await i.deferUpdate();
					const row = this._activePaginator.buildPage(this._activePaginator.page + 1);
					const components = currentSetup.components ? [await this.createComponents(currentSetup.components), row] : [row];
					await msgInt.editReply({ components });
					return;
				}

				if (value === '__paginate_prev__') {
					await i.deferUpdate();
					const row = this._activePaginator.buildPage(this._activePaginator.page - 1);
					const components = currentSetup.components ? [await this.createComponents(currentSetup.components), row] : [row];
					await msgInt.editReply({ components });
					return;
				}

				// Real selection
				const selected = this._activePaginator.options.find(o => o.value === value);
				collector.stop('selected');
				await i.deferUpdate();
				await this.nextTab(selected, msgInt, channel, member, client);
				if (currentSetup.selector.function) {
					currentSetup.selector.function(i.values, channel.guild, member);
				}
				return;
			}

			// ── Non-paginated select menu ──────────────────────────────────
			if (i.isStringSelectMenu() && currentSetup.selector) {
				const allOptions = await this.getSelectorOptions(currentSetup.selector, channel, client);
				const selected = allOptions.find(o => o.value === i.values[0]);
				if (selected) {
					collector.stop('selected');
					await i.deferUpdate();
					await this.selectCollectorOption(selected, i, currentSetup, msgInt, channel, member, client);
				}
				return;
			}

			// ── Buttons ────────────────────────────────────────────────────
			for (let component of currentSetup.components) {
				if (component.id === i.customId) {
					// Modals can't be deferred first
					if (component.modal) {
						collector.stop('selected');
						await this.createModal(component.modal, i, currentSetup, msgInt, channel, member, client);
						return;
					}

					collector.stop('selected');
					await i.deferUpdate();
					await this.selectCollectorOption(component, i, currentSetup, msgInt, channel, member, client);
					return;
				}
			}
		});

		collector.on('end', (_, reason) => {
			if (reason === 'selected' || reason === 'messageDelete') return;
			msgInt.editReply({ components: [] }).catch(() => {});
		});
	}

	async selectCollectorOption(component, i, currentSetup, msgInt, channel, member, client) {
		// Create the next step
		await this.nextTab(component, msgInt, channel, member, client);
		// Execute function
		if (component.function) component.function(channel.guild, member);
		// TO-DO: Should actually return a list of components and not a list of values
		if (currentSetup.selector && currentSetup.selector.function && i.values) currentSetup.selector.function(i.values, channel.guild, member);
	}

	async nextTab(component, msgInt, channel, member, client) {
		const next = component.nextFunction ? await component.nextFunction(msgInt, channel.guild, member) : component.next;
		next ?
			await this.createEmbed(next, msgInt, channel, member, client) :
			await this.createEmbed(component.id, msgInt, channel, member, client);
	}

	async createModal(modal, interaction, currentSetup, msgInt, channel, member, client) {
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
		await this.modalCollector(modal, msgInt, currentSetup, channel, member, client);
	}

	async modalCollector(modal, msgInt, currentSetup, channel, member, client) {
		try {
			const interaction = await msgInt.awaitModalSubmit({
				filter: (i) => i.customId === modal.id && i.user.id === member.id,
				time: 1000 * 60 * 5,
			});

			let inputArray = [];

			for (let input of modal.inputs) {
				const value = interaction.fields.getTextInputValue(input.id);
				const validation = await this.validateModalInput(input, value);

				if (validation) {
					await this.generateModalRetry(modal, validation, interaction, currentSetup, msgInt, channel, member, client);
					return;
				}

				inputArray.push(value);
			}

			await interaction.deferUpdate();
			await this.nextTab(modal, msgInt, channel, member, client);

			const modalSetup = currentSetup.components.find(x => x.modal?.id === modal.id);
			if (modalSetup?.function) modalSetup.function(interaction.fields, channel.guild);

		} catch (err) {
			// Timed out — silently clean up
		}
	}

	async validateModalInput(input, value) {
		if (!input.validation) return false;

		switch (input.validation) {
			case "number":
				if (isNaN(value)) return await this.createErrorEmbed("The `" + input.label + "` element is not a number.\n> Retries are currently unavailable. Please restart `?setup`.");
				break;
			default:
				return false;
		}
	}

	async generateModalRetry(modal, validation, interaction, currentSetup, msgInt, channel, member, client) {
		const retry = new ButtonBuilder()
			.setLabel("Retry")
			.setStyle(ButtonStyle.Primary)
			.setCustomId("retry")
			.setDisabled(true);

		await interaction.reply({
			embeds: [ validation ], components: [ new ActionRowBuilder().addComponents(retry) ], fetchReply: true 
		}).then((embed) => {
			const collector = embed.createMessageComponentCollector({
				max: 1,
				time: 1000 * 60 * 5,
			})
	
			// Add a listener to the collector
			collector?.on('collect', async (i) => {
				await this.createModal(modal, i, msgInt, currentSetup, channel, member, client);
				return;
			})
	
			// On collector end, remove all buttons
			collector?.on('end', (collected, reason) => {
				interaction.editReply({ components: [] });
			});
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
					.setLabel("All reactables")
					.setValue("all")
			);
		}
		
		for (const reactable of reactables) {
			select.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1))
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

	async createDefaultEmojiSelectorEmbed(interaction, reactable, reactableName) {
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