const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
        ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");

// Classes
const PaginatedSelector = require("./paginatedSelector");

/**
 * ReactableEmbeds
 *
 * Base class providing generic input patterns for reactable checks and actions.
 *
 * Available patterns:
 *   modalInput(interaction, reactable, config)          — text/number modal
 *   booleanToggle(interaction, reactable, config)       — enable/disable buttons
 *   paginatedSelect(interaction, reactable, config)     — paginated dropdown + disable button (single pick)
 *   paginatedMultiSelect(interaction, reactable, config) — paginated dropdown + reset button (multi-pick)
 */
class ReactableEmbeds {

    // Modal input

    /**
     * Presents a modal for text or number input, then saves and confirms.
     *
     * @param {Interaction} interaction
     * @param {object}      reactable
     * @param {object}      config
     * @param {string}      config.modalId           - Discord custom ID for the modal
     * @param {string}      config.modalTitle         - Modal window title
     * @param {string}      config.inputId            - Custom ID for the text input field
     * @param {string}      config.inputLabel         - Label shown on the input field
     * @param {string}      config.inputPlaceholder   - Placeholder text
     * @param {boolean}     [config.longForm]         - Use paragraph style instead of short
     * @param {boolean}     [config.required]         - Whether the field is required
     * @param {number}      [config.maxLength]        - Max character length
     * @param {string}      [config.currentValue]     - Pre-filled value
     * @param {'number'|'string'|null} [config.validate] - Validation type
     * @param {string}      config.dbField            - Mongoose field name to update
     * @param {string}      config.successTitle       - Embed title on success
     * @param {Function}    config.successDescription - (newValue) => string
     * @param {string}      config.embedTitle         - Title shown on the confirmation embed
     * @param {string}      config.embedColor         - Embed color
     */
    async modalInput(interaction, reactable, config) {
        const modal = new ModalBuilder()
            .setCustomId(config.modalId)
            .setTitle(config.modalTitle);

        const input = new TextInputBuilder()
            .setCustomId(config.inputId)
            .setLabel(config.inputLabel)
            .setStyle(config.longForm ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setPlaceholder(config.inputPlaceholder);

        if (config.required !== undefined) input.setRequired(config.required);
        if (config.maxLength)             input.setMaxLength(config.maxLength);
        if (config.currentValue !== undefined && config.currentValue !== null) {
            input.setValue(String(config.currentValue));
        }

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({ time: 900000 });
            let newValue = submitted.fields.getTextInputValue(config.inputId);

            // Validation
            if (config.validate === 'number') {
                const parsed = parseInt(newValue);
                if (isNaN(parsed) || parsed < 0) {
                    return await submitted.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Red")
                                .setTitle("❌ Invalid input")
                                .setDescription("Please enter a valid positive number.")
                        ],
                        ephemeral: true
                    });
                }
                newValue = parsed;
            }

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { [config.dbField]: newValue || null } }
            ).exec();

            await submitted.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.embedColor || "Green")
                        .setTitle(config.successTitle)
                        .setDescription(config.successDescription(newValue))
                ]
            });
        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error(`Error in modal input (${config.modalId}):`, error);
            }
        }
    }

    // Boolean toggle

    /**
     * Presents enable/disable buttons and saves the result.
     *
     * @param {Interaction} interaction
     * @param {object}      reactable
     * @param {object}      config
     * @param {string}      config.enableId           - Custom ID for the enable button
     * @param {string}      config.disableId          - Custom ID for the disable button
     * @param {string}      [config.enableLabel]      - Label for the enable button (default: 'Enable')
     * @param {string}      [config.disableLabel]     - Label for the disable button (default: 'Disable')
     * @param {ButtonStyle} [config.enableStyle]      - Style for the enable button (default: Success)
     * @param {ButtonStyle} [config.disableStyle]     - Style for the disable button (default: Secondary)
     * @param {string}      config.dbField            - Mongoose field name to update
     * @param {string}      config.embedTitle         - Title shown on the choice embed
     * @param {string}      config.embedDescription   - Description shown on the choice embed
     * @param {string}      config.embedColor         - Embed color
     * @param {boolean}     config.currentValue       - Current boolean value
     * @param {string}      config.successTitle       - Embed title on success
     * @param {Function}    config.successDescription - (newValue) => string
     * @param {string}      [config.successFooter]    - Optional footer on success embed
     */
    async booleanToggle(interaction, reactable, config) {
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(config.enableId)
                .setLabel(config.enableLabel || 'Enable')
                .setStyle(config.enableStyle || ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(config.disableId)
                .setLabel(config.disableLabel || 'Disable')
                .setStyle(config.disableStyle || ButtonStyle.Secondary)
        );

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.embedColor || "Blue")
                    .setTitle(config.embedTitle)
                    .setDescription(config.embedDescription)
                    .addFields({ name: "Current Value", value: config.currentValue ? "✅ Enabled" : "❌ Disabled" })
            ],
            components: [buttonRow]
        });

        const filter = i => (i.customId === config.enableId || i.customId === config.disableId) && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async i => {
            const newValue = i.customId === config.enableId;

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { [config.dbField]: newValue } }
            ).exec();

            const successEmbed = new EmbedBuilder()
                .setColor("Green")
                .setTitle(config.successTitle)
                .setDescription(config.successDescription(newValue));

            if (config.successFooter) successEmbed.setFooter({ text: config.successFooter });

            await i.update({ embeds: [successEmbed], components: [] });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Grey")
                            .setTitle("⏱️ Selection timed out")
                            .setDescription("No option was selected.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }

    // Paginated select (single pick)

    /**
     * Presents a paginated dropdown alongside a disable/remove button.
     * Used for single-value fields like sendsToChannel, awardedRole, etc.
     *
     * @param {Interaction} interaction
     * @param {object}      reactable
     * @param {object}      config
     * @param {string}      config.selectorId         - Custom ID for the select menu
     * @param {string}      config.selectorPlaceholder
     * @param {Array}       config.options            - [{ label, value }]
     * @param {string}      config.disableId          - Custom ID for the disable button
     * @param {string}      config.disableLabel       - Label for the disable button
     * @param {boolean}     config.disableEnabled     - Whether the disable button is enabled
     * @param {string}      config.dbField            - Mongoose field name to update
     * @param {string}      config.embedTitle         - Title shown on the choice embed
     * @param {string}      config.embedDescription   - Description shown on the choice embed
     * @param {string}      config.embedColor         - Embed color
     * @param {string}      config.currentValueText   - Formatted current value for the embed field
     * @param {string}      config.currentValueLabel  - Field name label (e.g. 'Current Channel')
     * @param {string}      config.successTitle       - Embed title on selection
     * @param {Function}    config.successDescription - (value) => string
     * @param {string}      config.disabledTitle      - Embed title when disabled
     * @param {string}      config.disabledDescription
     * @param {string}      config.emptyTitle         - Embed title when options list is empty
     * @param {string}      config.emptyDescription   - Embed description when options list is empty
     */
    async paginatedSelect(interaction, reactable, config) {
        if (config.options.length === 0) {
            return await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle(config.emptyTitle || "❌ No options available")
                        .setDescription(config.emptyDescription || "There are no options to select from.")
                ],
                components: []
            });
        }

        const disableRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(config.disableId)
                .setLabel(config.disableLabel)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!config.disableEnabled)
        );

        const paginator = new PaginatedSelector(
            { id: config.selectorId, placeholder: config.selectorPlaceholder },
            config.options
        );

        const reply = await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.embedColor || "Green")
                    .setTitle(config.embedTitle)
                    .setDescription(config.embedDescription)
                    .addFields({ name: config.currentValueLabel, value: config.currentValueText })
            ],
            components: [paginator.buildPage(0), disableRow],
            fetchReply: true
        });

        // Paginated selector — single pick, no re-attach needed
        paginator.attachStandaloneCollector(reply, interaction.user.id,
            async (value, i) => {
                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { [config.dbField]: value } }
                ).exec();

                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle(config.successTitle)
                            .setDescription(config.successDescription(value))
                    ],
                    components: []
                });

                disableCollector.stop('selected');
            },
            {
                onTimeout: () => interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Grey")
                            .setTitle("⏱️ Selection timed out")
                            .setDescription("No option was selected.")
                    ],
                    components: []
                }).catch(() => {})
            }
        );

        // Disable button — runs in parallel with the paginator
        const disableFilter = i => i.customId === config.disableId && i.user.id === interaction.user.id;
        const disableCollector = reply.createMessageComponentCollector({ filter: disableFilter, time: 1000 * 60 * 5 });

        disableCollector.on('collect', async i => {
            paginator.stop('disabled');
            disableCollector.stop('disabled');

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { [config.dbField]: null } }
            ).exec();

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(config.disabledTitle)
                        .setDescription(config.disabledDescription)
                ],
                components: []
            });
        });
    }

    // Paginated multi-select

    /**
     * Presents a paginated dropdown alongside a reset button.
     * Used for array fields like lockedBehindRoles, lockedBehindChannels.
     * Stays open after each selection so the user can keep adding values.
     *
     * @param {Interaction} interaction
     * @param {object}      reactable
     * @param {object}      config
     * @param {string}      config.selectorId           - Custom ID for the select menu
     * @param {string}      config.selectorPlaceholder
     * @param {Array}       config.options              - [{ label, value }]
     * @param {string}      config.resetId              - Custom ID for the reset button
     * @param {string}      config.resetLabel           - Label for the reset button
     * @param {string}      config.dbField              - Mongoose field name to update (array)
     * @param {Array}       config.currentValues        - Current array of selected values
     * @param {string}      config.embedTitle           - Title shown on the choice embed
     * @param {string}      config.embedColor           - Embed color
     * @param {string}      config.emptyDescription     - Embed description when nothing is selected yet
     * @param {string}      config.filledDescription    - Embed description when values exist
     * @param {string}      config.currentValuesLabel   - Field name label (e.g. 'Currently Locked Roles')
     * @param {Function}    config.formatValue          - (id) => string  (e.g. id => `<@&${id}>`)
     * @param {string}      config.duplicateTitle       - Embed title on duplicate selection
     * @param {Function}    config.duplicateDescription - (value) => string
     * @param {string}      config.addedTitle           - Embed title on successful add
     * @param {Function}    config.addedDescription     - (value) => string
     * @param {string}      config.resetTitle           - Embed title after reset
     * @param {string}      config.resetDescription
     */
    async paginatedMultiSelect(interaction, reactable, config) {
        // currentValues is mutated in place throughout the session
        const currentValues = config.currentValues;

        const resetRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(config.resetId)
                .setLabel(config.resetLabel)
                .setStyle(ButtonStyle.Danger)
        );

        const buildEmbed = () => new EmbedBuilder()
            .setColor(config.embedColor || "Blue")
            .setTitle(config.embedTitle)
            .setDescription(currentValues.length === 0 ? config.emptyDescription : config.filledDescription)
            .addFields({
                name: config.currentValuesLabel,
                value: currentValues.length > 0
                    ? currentValues.map(config.formatValue).join(", ")
                    : "None"
            });

        const paginator = new PaginatedSelector(
            { id: config.selectorId, placeholder: config.selectorPlaceholder },
            config.options
        );

        const reply = await interaction.update({
            embeds: [buildEmbed()],
            components: [paginator.buildPage(0), resetRow],
            fetchReply: true
        });

        const collectorOpts = {
            extraRows: [resetRow],
            onTimeout: () => interaction.message.edit({ components: [] }).catch(() => {})
        };

        // Named so it can reference itself on re-attach
        const onSelect = async (value, i) => {
            // Duplicate check
            if (currentValues.includes(value)) {
                await i.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Orange")
                            .setTitle(config.duplicateTitle)
                            .setDescription(config.duplicateDescription(value))
                    ],
                    ephemeral: true
                });
                paginator.attachStandaloneCollector(reply, interaction.user.id, onSelect, collectorOpts);
                return;
            }

            currentValues.push(value);
            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { [config.dbField]: currentValues } }
            ).exec();

            // Rebuild with updated embed, staying on the current page
            await i.update({
                embeds: [buildEmbed()],
                components: [paginator.buildPage(paginator.page), resetRow]
            });

            // Re-attach for further selections
            paginator.attachStandaloneCollector(reply, interaction.user.id, onSelect, collectorOpts);

            await i.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(config.addedTitle)
                        .setDescription(config.addedDescription(value))
                ],
                ephemeral: true
            });
        };

        // Initial attachment
        paginator.attachStandaloneCollector(reply, interaction.user.id, onSelect, collectorOpts);

        // Reset button — runs in parallel with the paginator
        const resetFilter = i => i.customId === config.resetId && i.user.id === interaction.user.id;
        const resetCollector = reply.createMessageComponentCollector({ filter: resetFilter, time: 1000 * 60 * 5 });

        resetCollector.on('collect', async i => {
            paginator.stop('reset');
            resetCollector.stop('reset');

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { [config.dbField]: [] } }
            ).exec();

            currentValues.length = 0;

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(config.resetTitle)
                        .setDescription(config.resetDescription)
                ],
                components: []
            });
        });
    }
    // Reaction emoji input

    /**
     * Prompts the user to react to the message with an emoji, with an optional
     * disable button running in parallel.
     *
     * @param {Interaction} interaction
     * @param {object}      reactable
     * @param {object}      config
     * @param {string}      config.disableId           - Custom ID for the disable button
     * @param {string}      config.disableLabel        - Label for the disable button
     * @param {string}      config.dbField             - Mongoose field name to update
     * @param {string}      config.embedTitle          - Title shown on the prompt embed
     * @param {string}      config.embedDescription    - Description shown on the prompt embed
     * @param {string}      config.embedColor          - Embed color
     * @param {string}      config.successTitle        - Embed title when an emoji is picked
     * @param {Function}    config.successDescription  - (reaction) => string
     * @param {string}      config.disabledTitle       - Embed title when disabled
     * @param {string}      config.disabledDescription
     */
    async reactionEmojiInput(interaction, reactable, config) {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.embedColor || "Green")
                    .setTitle(config.embedTitle)
                    .setDescription(config.embedDescription)
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(config.disableId)
                        .setLabel(config.disableLabel)
                        .setStyle(ButtonStyle.Danger)
                )
            ]
        });

        let handled = false;

        // Listen for a reaction on the message
        const reactionCollector = interaction.message.createReactionCollector({ time: 60000 });

        reactionCollector.on('collect', async (reaction, user) => {
            if (handled || user.id !== interaction.user.id) return;
            handled = true;

            const emojiToSave = reaction.emoji.id || reaction.emoji.name;

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { [config.dbField]: emojiToSave } }
            ).exec();

            reactionCollector.stop();
            buttonCollector.stop('selected');

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(config.successTitle)
                        .setDescription(config.successDescription(reaction))
                ],
                components: []
            }).catch(() => {});
        });

        // Listen for the disable button in parallel
        const filter = i => i.customId === config.disableId && i.user.id === interaction.user.id;
        const buttonCollector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        buttonCollector.on('collect', async i => {
            if (handled) return;
            handled = true;

            await i.deferUpdate();
            reactionCollector.stop('disabled');

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { [config.dbField]: null } }
            ).exec();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(config.disabledTitle)
                        .setDescription(config.disabledDescription)
                ],
                components: []
            });
        });

        reactionCollector.on('end', (_, reason) => {
            if (!handled && reason !== 'disabled') {
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Grey")
                            .setTitle("⏱️ Selection timed out")
                            .setDescription("No emoji was selected.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }
}

module.exports = ReactableEmbeds;