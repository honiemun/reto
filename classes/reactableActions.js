const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");

class ReactableActions {

    constructor() {
        if (ReactableActions._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        ReactableActions._instance = this;
    }

    async viewActions(interaction, reactable) {
        const reactableName = reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Actions for " + reactableName)
                    .addFields(
                        { name: "Karma Awarded", value: String(reactable.karmaAwarded || 0), inline: true },
                        { name: "Deletes Message", value: reactable.deletesMessage ? "✅ Yes" : "❌ No", inline: true },
                        { name: "Sends To Channel", value: reactable.sendsToChannel ? "<#" + reactable.sendsToChannel + ">" : "None", inline: true },
                        { name: "Custom Reply", value: reactable.reply ? "```\n" + reactable.reply + "\n```" : "None", inline: false },
                        { name: "Timeout", value: String(reactable.timeout || 0) + " seconds", inline: true }
                    )
            ]
        });
    }

    async setActions(interaction, reactable) {
        const reactableName = reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('action_select')
            .setPlaceholder('Select an action to edit')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Karma Awarded')
                    .setDescription('Amount of karma to award')
                    .setValue('karmaAwarded'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Deletes Message')
                    .setDescription('Whether to delete the original message')
                    .setValue('deletesMessage'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Sends To Channel')
                    .setDescription('Channel to send pinned messages to')
                    .setValue('sendsToChannel'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Custom Reply')
                    .setDescription('Custom message to reply with')
                    .setValue('reply'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Timeout')
                    .setDescription('Timeout duration for message author')
                    .setValue('timeout')
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Edit Actions for " + reactableName)
                    .setDescription("Select which action you'd like to modify.")
            ],
            components: [row]
        });

        const filter = i => i.customId === 'action_select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async i => {
            const selectedAction = i.values[0];

            switch (selectedAction) {
                case 'karmaAwarded':
                    await this.editKarmaAwarded(i, reactable, reactableName);
                    break;
                case 'deletesMessage':
                    await this.editDeletesMessage(i, reactable, reactableName);
                    break;
                case 'sendsToChannel':
                    await this.editSendsToChannel(i, reactable, reactableName);
                    break;
                case 'reply':
                    await this.editReply(i, reactable, reactableName);
                    break;
                case 'timeout':
                    await this.editTimeout(i, reactable, reactableName);
                    break;
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Grey")
                            .setTitle("⏱️ Selection timed out")
                            .setDescription("No action was selected.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }

    async editKarmaAwarded(interaction, reactable, reactableName) {
        const currentValue = reactable.karmaAwarded || 0;

        const modal = new ModalBuilder()
            .setCustomId('karma_modal')
            .setTitle('Edit Karma Awarded');

        const karmaInput = new TextInputBuilder()
            .setCustomId('karma_value')
            .setLabel('Karma Amount')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a number (can be negative)')
            .setValue(String(currentValue));

        const actionRow = new ActionRowBuilder().addComponents(karmaInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({ time: 900000 });
            const newValue = parseInt(submitted.fields.getTextInputValue('karma_value'));

            if (isNaN(newValue)) {
                return await submitted.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("❌ Invalid input")
                            .setDescription("Please enter a valid number (can be negative).")
                    ],
                    ephemeral: true
                });
            }

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { karmaAwarded: newValue } }
            ).exec();

            await submitted.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Karma Awarded Updated")
                        .setDescription("The **" + reactableName + "** reactable will now award **" + newValue + "** karma.")
                ]
            });
        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error('Error in karma modal:', error);
            }
        }
    }

    async editDeletesMessage(interaction, reactable, reactableName) {
        const currentValue = reactable.deletesMessage || false;

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('delete_msg_true')
                    .setLabel('Enable')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('delete_msg_false')
                    .setLabel('Disable')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Edit Deletes Message")
                    .setDescription("Should the original message be deleted when this reactable is used?")
                    .addFields(
                        { name: "Current Value", value: currentValue ? "✅ Enabled" : "❌ Disabled" }
                    )
            ],
            components: [buttonRow]
        });

        const filter = i => (i.customId === 'delete_msg_true' || i.customId === 'delete_msg_false') && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async i => {
            const newValue = i.customId === 'delete_msg_true';

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { deletesMessage: newValue } }
            ).exec();

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Deletes Message Updated")
                        .setDescription("The **" + reactableName + "** reactable will " + (newValue ? "**now**" : "**no longer**") + " delete the original message.")
                ],
                components: []
            });
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

    async editSendsToChannel(interaction, reactable, reactableName) {
        const guild = interaction.guild;

        // Get all text channels from the guild (up to 25)
        const allChannels = Array.from(guild.channels.cache
            .filter(channel => channel.isTextBased() && !channel.isDMBased())
            .sort((a, b) => a.position - b.position)
            .values())
            .slice(0, 25);

        if (allChannels.length === 0) {
            return await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ No channels available")
                        .setDescription("There are no text channels on this server to send messages to.")
                ],
                components: []
            });
        }

        // Create select menu for channels
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('channel_select')
            .setPlaceholder('Select a channel to send pinned messages to')
            .addOptions(
                ...allChannels.map(channel =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(channel.name)
                        .setValue(channel.id)
                )
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Create disable button
        const disableButton = new ButtonBuilder()
            .setCustomId('channel_disable')
            .setLabel('Disable Channel Sending')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(reactable.sendsToChannel ? false : true);

        const buttonRow = new ActionRowBuilder().addComponents(disableButton);

        // Display current channel
        let currentChannelText = "None";
        if (reactable.sendsToChannel) {
            const currentChannel = guild.channels.cache.get(reactable.sendsToChannel);
            currentChannelText = currentChannel ? `<#${reactable.sendsToChannel}>` : `Unknown Channel (${reactable.sendsToChannel})`;
        }

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Edit Sends To Channel")
                    .setDescription("Select which channel pinned messages should be sent to, or disable channel sending.")
                    .addFields(
                        { name: "Current Channel", value: currentChannelText }
                    )
            ],
            components: [selectRow, buttonRow]
        });

        let handled = false;

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async i => {
            if (handled) return;
            handled = true;

            if (i.customId === 'channel_select') {
                const selectedChannelId = i.values[0];

                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { sendsToChannel: selectedChannelId } }
                ).exec();

                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Channel Updated")
                            .setDescription(`Pinned messages from **${reactableName}** will now be sent to <#${selectedChannelId}>.`)
                    ],
                    components: []
                });
            } else if (i.customId === 'channel_disable') {
                // Defer the update to prevent interaction token timeout
                await i.deferUpdate();

                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { sendsToChannel: null } }
                ).exec();

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Channel Sending Disabled")
                            .setDescription(`**${reactableName}** will no longer send pinned messages to any channel.`)
                    ],
                    components: []
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0 && !handled) {
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Grey")
                            .setTitle("⏱️ Selection timed out")
                            .setDescription("No channel was selected.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }

    async editTimeout(interaction, reactable, reactableName) {
        const currentValue = reactable.timeout || 0;

        const modal = new ModalBuilder()
            .setCustomId('timeout_modal')
            .setTitle('Edit Timeout');

        const timeoutInput = new TextInputBuilder()
            .setCustomId('timeout_value')
            .setLabel('Timeout Duration')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter timeout in seconds (0 to disable)')
            .setValue(String(currentValue));

        const actionRow = new ActionRowBuilder().addComponents(timeoutInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({ time: 900000 });
            const newValue = parseInt(submitted.fields.getTextInputValue('timeout_value'));

            if (isNaN(newValue) || newValue < 0) {
                return await submitted.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("❌ Invalid input")
                            .setDescription("Please enter a valid number of seconds (or set to 0 to disable).")
                    ],
                    ephemeral: true
                });
            }

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { timeout: newValue } }
            ).exec();

            const statusText = newValue === 0 ? "disabled" : `set to ${newValue} seconds`;

            await submitted.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Timeout Updated")
                        .setDescription(`The **${reactableName}** reactable timeout has been **${statusText}**.`)
                ]
            });
        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error('Error in timeout modal:', error);
            }
        }
    }

    async editReply(interaction, reactable, reactableName) {
        const currentValue = reactable.reply || "";

        const modal = new ModalBuilder()
            .setCustomId('reply_modal')
            .setTitle('Edit Custom Reply');

        const replyInput = new TextInputBuilder()
            .setCustomId('reply_value')
            .setLabel('Custom Reply Message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Leave empty to disable replies. Supports formatting modifiers like {a}, {r}, {k}, etc.')
            .setMaxLength(1000)
            .setRequired(false);

        if (currentValue) {
            replyInput.setValue(currentValue);
        }

        const actionRow = new ActionRowBuilder().addComponents(replyInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({ time: 900000 });
            const newValue = submitted.fields.getTextInputValue('reply_value') || "";

            // If empty, disable replies directly
            if (!newValue || newValue.trim() === "") {
                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { reply: null } }
                ).exec();

                return await submitted.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Custom Replies Disabled")
                            .setDescription("The **" + reactableName + "** reactable will no longer send custom replies.")
                    ]
                });
            }

            // Show buttons for confirm or disable
            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_reply')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('disable_reply')
                        .setLabel('Disable Replies')
                        .setStyle(ButtonStyle.Danger)
                );

            await submitted.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("Confirm Reply Change")
                        .setDescription("Choose an action:")
                        .addFields(
                            { name: "New Reply", value: "```\n" + newValue + "\n```" }
                        )
                ],
                components: [buttonRow],
                ephemeral: true
            });

            const filter = i => (i.customId === 'confirm_reply' || i.customId === 'disable_reply') && i.user.id === interaction.user.id;
            const buttonCollector = submitted.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

            buttonCollector.on('collect', async buttonInteraction => {
                if (buttonInteraction.customId === 'disable_reply') {
                    // Set reply to null
                    await reactableSchema.updateOne(
                        { _id: reactable._id },
                        { $set: { reply: null } }
                    ).exec();

                    await buttonInteraction.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("✅ Custom Replies Disabled")
                                .setDescription("The **" + reactableName + "** reactable will no longer send custom replies.")
                        ],
                        components: []
                    });
                } else {
                    // Confirm the new reply value
                    await reactableSchema.updateOne(
                        { _id: reactable._id },
                        { $set: { reply: newValue } }
                    ).exec();

                    await buttonInteraction.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("✅ Custom Reply Updated")
                                .setDescription("The **" + reactableName + "** reactable will now reply with:\n```\n" + newValue + "\n```")
                        ],
                        components: []
                    });
                }
            });

            buttonCollector.on('end', collected => {
                if (collected.size === 0) {
                    submitted.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Grey")
                                .setTitle("⏱️ Selection timed out")
                                .setDescription("No action was taken.")
                        ],
                        components: []
                    }).catch(() => {});
                }
            });
        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error('Error in reply modal:', error);
            }
        }
    }

}

module.exports = new ReactableActions();
