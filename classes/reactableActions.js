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
                        { name: "Sends To Channel", value: reactable.sendsToChannel ? "<#" + reactable.sendsToChannel + ">" : "None", inline: true },
                        { name: "React to Message", value: reactable.reactionEmoji ? reactable.reactionEmoji : "None", inline: true },
                        { name: "Custom Reply", value: reactable.reply ? "```\n" + reactable.reply + "\n```" : "None", inline: false },
                        { name: "Give Role to Author", value: reactable.awardedRole ? "<@&" + reactable.awardedRole + ">" : "None", inline: true },
                        { name: "Give Role to Reactor", value: reactable.reactorAwardedRole ? "<@&" + reactable.reactorAwardedRole + ">" : "None", inline: true },
                        { name: "Deletes Message", value: reactable.deletesMessage ? "✅ Yes" : "❌ No", inline: true },
                        { name: "Timeout Author", value: String(reactable.timeout || 0) + " seconds", inline: true },
                        { name: "Kicks Author", value: reactable.kicksUser ? "✅ Yes" : "❌ No", inline: true },
                        { name: "Bans Author", value: reactable.bansUser ? "✅ Yes" : "❌ No", inline: true }
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
                    .setLabel('Timeout Author')
                    .setDescription('Timeout duration for message author')
                    .setValue('timeout'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Give Role to Author')
                    .setDescription('Role to award to message author')
                    .setValue('awardedRole'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Give Role to Reactor')
                    .setDescription('Role to award to reactors')
                    .setValue('reactorAwardedRole'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('React to Message')
                    .setDescription('Emoji to react with')
                    .setValue('reactionEmoji'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Kicks Author')
                    .setDescription('Whether to kick the message author')
                    .setValue('kicksUser'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Bans Author')
                    .setDescription('Whether to ban the message author')
                    .setValue('bansUser')
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
                case 'awardedRole':
                    await this.editAwardedRole(i, reactable, reactableName);
                    break;
                case 'reactorAwardedRole':
                    await this.editReactorAwardedRole(i, reactable, reactableName);
                    break;
                case 'reactionEmoji':
                    await this.editReactionEmoji(i, reactable, reactableName);
                    break;
                case 'kicksUser':
                    await this.editKicksUser(i, reactable, reactableName);
                    break;
                case 'bansUser':
                    await this.editBansUser(i, reactable, reactableName);
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
            .setLabel('Timeout Author Duration')
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
                        .setTitle("✅ Timeout Author Updated")
                        .setDescription(`The **${reactableName}** reactable timeout has been **${statusText}**.`)
                        .setFooter({ text: "Make sure the bot has the Time Out Members permission on this server before using this reactable." })
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

    async editAwardedRole(interaction, reactable, reactableName) {
        const guild = interaction.guild;

        // Get all roles from the guild (up to 25)
        const allRoles = Array.from(guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .values())
            .filter(role => !role.managed && role.id !== guild.id)
            .slice(0, 25);

        if (allRoles.length === 0) {
            return await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ No roles available")
                        .setDescription("There are no manageable roles on this server.")
                ],
                components: []
            });
        }

        // Create select menu for roles
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('role_select')
            .setPlaceholder('Select a role to award to message author')
            .addOptions(
                ...allRoles.map(role =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(role.name)
                        .setValue(role.id)
                )
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Create disable button
        const disableButton = new ButtonBuilder()
            .setCustomId('role_disable')
            .setLabel('Remove Role')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(reactable.awardedRole ? false : true);

        const buttonRow = new ActionRowBuilder().addComponents(disableButton);

        // Display current role
        let currentRoleText = "None";
        if (reactable.awardedRole) {
            const currentRole = guild.roles.cache.get(reactable.awardedRole);
            currentRoleText = currentRole ? `<@&${reactable.awardedRole}>` : `Unknown Role (${reactable.awardedRole})`;
        }

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Edit Give Role to Author")
                    .setDescription("Select which role to award to the original message author.")
                    .addFields(
                        { name: "Current Role", value: currentRoleText }
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

            if (i.customId === 'role_select') {
                const selectedRoleId = i.values[0];

                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { awardedRole: selectedRoleId } }
                ).exec();

                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Role Updated")
                            .setDescription(`The **${reactableName}** reactable will now award the <@&${selectedRoleId}> role.`)
                    ],
                    components: []
                });
            } else if (i.customId === 'role_disable') {
                await i.deferUpdate();

                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { awardedRole: null } }
                ).exec();

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Role Removed")
                            .setDescription(`The **${reactableName}** reactable will no longer award a role.`)
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
                            .setDescription("No role was selected.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }

    async editReactorAwardedRole(interaction, reactable, reactableName) {
        const guild = interaction.guild;

        // Get all roles from the guild (up to 25)
        const allRoles = Array.from(guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .values())
            .filter(role => !role.managed && role.id !== guild.id)
            .slice(0, 25);

        if (allRoles.length === 0) {
            return await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ No roles available")
                        .setDescription("There are no manageable roles on this server.")
                ],
                components: []
            });
        }

        // Create select menu for roles
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('reactor_role_select')
            .setPlaceholder('Select a role to award to reactors')
            .addOptions(
                ...allRoles.map(role =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(role.name)
                        .setValue(role.id)
                )
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Create disable button
        const disableButton = new ButtonBuilder()
            .setCustomId('reactor_role_disable')
            .setLabel('Remove Role')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(reactable.reactorAwardedRole ? false : true);

        const buttonRow = new ActionRowBuilder().addComponents(disableButton);

        // Display current role
        let currentRoleText = "None";
        if (reactable.reactorAwardedRole) {
            const currentRole = guild.roles.cache.get(reactable.reactorAwardedRole);
            currentRoleText = currentRole ? `<@&${reactable.reactorAwardedRole}>` : `Unknown Role (${reactable.reactorAwardedRole})`;
        }

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Edit Give Role to Reactor")
                    .setDescription("Select which role to award to users who react with this reactable.")
                    .addFields(
                        { name: "Current Role", value: currentRoleText }
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

            if (i.customId === 'reactor_role_select') {
                const selectedRoleId = i.values[0];

                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { reactorAwardedRole: selectedRoleId } }
                ).exec();

                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Role Updated")
                            .setDescription(`Reactors with the **${reactableName}** reactable will now receive the <@&${selectedRoleId}> role.`)
                    ],
                    components: []
                });
            } else if (i.customId === 'reactor_role_disable') {
                await i.deferUpdate();

                await reactableSchema.updateOne(
                    { _id: reactable._id },
                    { $set: { reactorAwardedRole: null } }
                ).exec();

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Role Removed")
                            .setDescription(`Reactors will no longer receive a role from the **${reactableName}** reactable.`)
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
                            .setDescription("No role was selected.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }

    async editReactionEmoji(interaction, reactable, reactableName) {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Set Reaction Emoji")
                    .setDescription("React to this message with the emoji you'd like to use, or press the button below to disable.")
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('emoji_disable')
                        .setLabel('Disable Reaction Emoji')
                        .setStyle(ButtonStyle.Danger)
                )
            ]
        });

        let handled = false;

        // Listen for reactions on the message
        const reactionCollector = interaction.message.createReactionCollector({ time: 60000 });

        reactionCollector.on('collect', async (reaction, user) => {
            if (handled || user.id !== interaction.user.id) return;
            handled = true;

            const emojiToSave = reaction.emoji.id || reaction.emoji.name;

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { reactionEmoji: emojiToSave } }
            ).exec();

            reactionCollector.stop();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Reaction Emoji Updated")
                        .setDescription(`The **${reactableName}** reactable will now react with: ${reaction.emoji}`)
                ],
                components: []
            }).catch(() => {});
        });

        // Listen for button clicks
        const filter = i => i.customId === 'emoji_disable' && i.user.id === interaction.user.id;
        const buttonCollector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        buttonCollector.on('collect', async i => {
            if (handled) return;
            handled = true;

            await i.deferUpdate();

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { reactionEmoji: null } }
            ).exec();

            reactionCollector.stop();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Reaction Emoji Disabled")
                        .setDescription("The **" + reactableName + "** reactable will no longer react with an emoji.")
                ],
                components: []
            });
        });

        reactionCollector.on('end', () => {
            if (!handled) {
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

    async editKicksUser(interaction, reactable, reactableName) {
        const currentValue = reactable.kicksUser || false;

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('kicks_true')
                    .setLabel('Enable')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('kicks_false')
                    .setLabel('Disable')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Edit Kicks Author")
                    .setDescription("Should the original message author be kicked when this reactable is used?")
                    .addFields(
                        { name: "Current Value", value: currentValue ? "✅ Enabled" : "❌ Disabled" }
                    )
            ],
            components: [buttonRow]
        });

        const filter = i => (i.customId === 'kicks_true' || i.customId === 'kicks_false') && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async i => {
            const newValue = i.customId === 'kicks_true';

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { kicksUser: newValue } }
            ).exec();

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Kicks Author Updated")
                        .setDescription("The **" + reactableName + "** reactable will " + (newValue ? "**now**" : "**no longer**") + " kick the original message author.")
                        .setFooter({ text: "Make sure the bot has the Kick Members permission on this server before using this reactable." })
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

    async editBansUser(interaction, reactable, reactableName) {
        const currentValue = reactable.bansUser || false;

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bans_true')
                    .setLabel('Enable')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('bans_false')
                    .setLabel('Disable')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Edit Bans User")
                    .setDescription("Should the original message author be banned when this reactable is used?")
                    .addFields(
                        { name: "Current Value", value: currentValue ? "✅ Enabled" : "❌ Disabled" }
                    )
            ],
            components: [buttonRow]
        });

        const filter = i => (i.customId === 'bans_true' || i.customId === 'bans_false') && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async i => {
            const newValue = i.customId === 'bans_true';

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { bansUser: newValue } }
            ).exec();

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Bans User Updated")
                        .setDescription("The **" + reactableName + "** reactable will " + (newValue ? "**now**" : "**no longer**") + " ban the original message author.")
                        .setFooter({ text: "Make sure the bot has the Ban Members permission on this server before using this reactable." })

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
}

module.exports = new ReactableActions();
