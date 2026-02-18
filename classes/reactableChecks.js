const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");

class ReactableChecks {

    constructor() {
        if (ReactableChecks._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        ReactableChecks._instance = this;
    }

    async viewChecks(interaction, reactable) {
        const reactableName = reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1);

        // Convert role IDs to role mentions if they exist
        let rolesText = "None";
        if (reactable.lockedBehindRoles && reactable.lockedBehindRoles.length > 0) {
            rolesText = reactable.lockedBehindRoles.map(roleId => `<@&${roleId}>`).join(", ");
        }

        // Convert channel IDs to channel mentions if they exist
        let channelsText = "None";
        if (reactable.lockedBehindChannels && reactable.lockedBehindChannels.length > 0) {
            channelsText = reactable.lockedBehindChannels.map(channelId => `<#${channelId}>`).join(", ");
        }

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("Checks for " + reactableName)
                    .addFields(
                        { name: "Reaction Threshold", value: String(reactable.reactionThreshold || 0), inline: true },
                        { name: "Fires Once", value: reactable.firesOnce ? "✅ Yes" : "❌ No", inline: true },
                        { name: "Self React", value: reactable.selfReaction ? "✅ Yes" : "❌ No", inline: true },
                        { name: "Locked Behind Roles", value: rolesText, inline: false },
                        { name: "Locked Behind Channels", value: channelsText, inline: false }
                    )
            ]
        });
    }

    async setChecks(interaction, reactable) {
        const reactableName = reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('check_select')
            .setPlaceholder('Select a check to edit')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Reaction Threshold')
                    .setDescription('How many reactions needed to trigger')
                    .setValue('reactionThreshold'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Fires Once')
                    .setDescription('Can only be used once per message')
                    .setValue('firesOnce'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Self React')
                    .setDescription('Allow users to react to their own messages')
                    .setValue('selfReaction'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Locked Behind Roles')
                    .setDescription('Require specific roles to use')
                    .setValue('lockedBehindRoles'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Locked Behind Channels')
                    .setDescription('Restrict to specific channels')
                    .setValue('lockedBehindChannels')
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("Edit Checks for " + reactableName)
                    .setDescription("Select which check you'd like to modify.")
            ],
            components: [row]
        });

        const filter = i => i.customId === 'check_select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async i => {
            const selectedCheck = i.values[0];

            switch (selectedCheck) {
                case 'reactionThreshold':
                    await this.editReactionThreshold(i, reactable, reactableName);
                    break;
                case 'firesOnce':
                    await this.editFiresOnce(i, reactable, reactableName);
                    break;
                case 'selfReaction':
                    await this.editSelfReact(i, reactable, reactableName);
                    break;
                case 'lockedBehindRoles':
                    await this.editLockedRoles(i, reactable, reactableName);
                    break;
                case 'lockedBehindChannels':
                    await this.editLockedChannels(i, reactable, reactableName);
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
                            .setDescription("No check was selected.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }

    async editReactionThreshold(interaction, reactable, reactableName) {
        const currentThreshold = reactable.reactionThreshold || 0;

        const modal = new ModalBuilder()
            .setCustomId('threshold_modal')
            .setTitle('Edit Reaction Threshold');

        const thresholdInput = new TextInputBuilder()
            .setCustomId('threshold_value')
            .setLabel('Reaction Threshold')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a number (0 = disabled)')
            .setValue(String(currentThreshold));

        const actionRow = new ActionRowBuilder().addComponents(thresholdInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({ time: 900000 });
            const newValue = parseInt(submitted.fields.getTextInputValue('threshold_value'));

            if (isNaN(newValue) || newValue < 0) {
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

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { reactionThreshold: newValue } }
            ).exec();

            await submitted.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Reaction Threshold Updated")
                        .setDescription("The reaction threshold for **" + reactableName + "** is now set to **" + newValue + "**.")
                ]
            });
        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error('Error in reaction threshold modal:', error);
            }
        }
    }

    async editFiresOnce(interaction, reactable, reactableName) {
        const currentValue = reactable.firesOnce || false;

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fires_once_true')
                    .setLabel('Enable')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('fires_once_false')
                    .setLabel('Disable')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("Edit Fires Once")
                    .setDescription("Should this reactable only work once per message?")
                    .addFields(
                        { name: "Current Value", value: currentValue ? "✅ Enabled" : "❌ Disabled" }
                    )
            ],
            components: [buttonRow]
        });

        const filter = i => (i.customId === 'fires_once_true' || i.customId === 'fires_once_false') && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async i => {
            const newValue = i.customId === 'fires_once_true';

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { firesOnce: newValue } }
            ).exec();

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Fires Once Updated")
                        .setDescription("The **" + reactableName + "** reactable will " + (newValue ? "**now**" : "**no longer**") + " fire only once per message.")
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

    async editSelfReact(interaction, reactable, reactableName) {
        const currentValue = reactable.selfReaction || false;

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('self_react_true')
                    .setLabel('Enable')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('self_react_false')
                    .setLabel('Disable')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("Edit Self React")
                    .setDescription("Should users be able to react to their own messages with this reactable?")
                    .addFields(
                        { name: "Current Value", value: currentValue ? "✅ Enabled" : "❌ Disabled" }
                    )
            ],
            components: [buttonRow]
        });

        const filter = i => (i.customId === 'self_react_true' || i.customId === 'self_react_false') && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async i => {
            const newValue = i.customId === 'self_react_true';

            await reactableSchema.updateOne(
                { _id: reactable._id },
                { $set: { selfReaction: newValue } }
            ).exec();

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Self React Updated")
                        .setDescription("Users will " + (newValue ? "**now**" : "**no longer**") + " be able to react to their own messages with **" + reactableName + "**.")
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

    async editLockedRoles(interaction, reactable, reactableName) {
        const currentRoles = reactable.lockedBehindRoles || [];
        const guild = interaction.guild;

        // Helper function to build the interface
        const buildInterface = () => {
            // Get all roles from the guild (excluding @everyone)
            const allRoles = Array.from(guild.roles.cache
                .filter(role => role.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .values())
                .slice(0, 25);

            // Display currently locked roles
            let currentRolesText = currentRoles.length > 0 
                ? currentRoles.map(roleId => {
                    const role = guild.roles.cache.get(roleId);
                    return role ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
                }).join(", ")
                : "None";

            // Create select menu for adding roles
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('role_select_add')
                .setPlaceholder('Select a role to add')
                .addOptions(
                    ...allRoles.map(role => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(role.name)
                            .setValue(role.id)
                    )
                );

            // Create action row with select menu and reset button
            const selectRow = new ActionRowBuilder().addComponents(selectMenu);
            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('role_reset')
                        .setLabel('Reset All Roles')
                        .setStyle(ButtonStyle.Danger)
                );

            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("Edit Locked Behind Roles")
                        .setDescription(currentRoles.length === 0 
                            ? "No roles are currently locked. Select roles to add access restrictions." 
                            : "Select a role to add to the lock list, or reset all roles.")
                        .addFields(
                            { name: "Currently Locked Roles", value: currentRolesText }
                        )
                ],
                components: [selectRow, buttonRow]
            };
        };

        // Initial response
        await interaction.update(buildInterface());

        // Create collectors
        const setupCollectors = () => {
            const filter = i => 
                (i.customId === 'role_select_add' || i.customId === 'role_reset') && 
                i.user.id === interaction.user.id;

            const collector = interaction.message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'role_select_add') {
                    if (!i.isStringSelectMenu() || !i.values) return;

                    const selectedRoleId = i.values[0];

                    if (currentRoles.includes(selectedRoleId)) {
                        return await i.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor("Orange")
                                    .setTitle("⚠️ Role already locked")
                                    .setDescription(`The role <@&${selectedRoleId}> is already in the lock list.`)
                            ]
                        });
                    }

                    currentRoles.push(selectedRoleId);

                    await reactableSchema.updateOne(
                        { _id: reactable._id },
                        { $set: { lockedBehindRoles: currentRoles } }
                    ).exec();

                    collector.stop('restart');
                    await i.update(buildInterface());
                    setupCollectors();

                    await i.followUp({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("✅ Role Added")
                                .setDescription(`Added <@&${selectedRoleId}> to the lock list for **${reactableName}**.`)
                        ],
                        ephemeral: true
                    });

                } else if (i.customId === 'role_reset') {
                    collector.stop('reset');

                    await reactableSchema.updateOne(
                        { _id: reactable._id },
                        { $set: { lockedBehindRoles: [] } }
                    ).exec();

                    currentRoles.length = 0;

                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("✅ Role Lock Reset")
                                .setDescription(`Reset all role locks for **${reactableName}**. This reactable can now be used by anyone.`)
                        ],
                        components: []
                    });
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason !== 'restart' && reason !== 'reset') {
                    interaction.message.edit({ components: [] }).catch(() => {});
                }
            });
        };

        // Setup initial collectors
        setupCollectors();
    }

    async editLockedChannels(interaction, reactable, reactableName) {
        const currentChannels = reactable.lockedBehindChannels || [];
        const guild = interaction.guild;

        // Helper function to build the interface
        const buildInterface = () => {
            // Get text-based channels from the guild, sorted by position
            const allChannels = Array.from(guild.channels.cache
                .filter(channel => 
                    channel.type === ChannelType.GuildText ||
                    channel.type === ChannelType.GuildAnnouncement
                )
                .sort((a, b) => a.position - b.position)
                .values())
                .slice(0, 25);

            // Display currently locked channels
            let currentChannelsText = currentChannels.length > 0
                ? currentChannels.map(channelId => {
                    const channel = guild.channels.cache.get(channelId);
                    return channel ? `<#${channelId}>` : `Unknown Channel (${channelId})`;
                }).join(", ")
                : "None";

            // Create select menu for adding channels
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('channel_select_add')
                .setPlaceholder('Select a channel to add')
                .addOptions(
                    ...allChannels.map(channel =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(channel.name)
                            .setValue(channel.id)
                    )
                );

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);
            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('channel_reset')
                        .setLabel('Reset All Channels')
                        .setStyle(ButtonStyle.Danger)
                );

            return {
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blue")
                        .setTitle("Edit Locked Behind Channels")
                        .setDescription(currentChannels.length === 0
                            ? "No channels are currently locked. Select channels to restrict where this reactable can be used."
                            : "Select a channel to add to the lock list, or reset all channels.")
                        .addFields(
                            { name: "Currently Locked Channels", value: currentChannelsText }
                        )
                ],
                components: [selectRow, buttonRow]
            };
        };

        // Initial response
        await interaction.update(buildInterface());

        // Create collectors
        const setupCollectors = () => {
            const filter = i =>
                (i.customId === 'channel_select_add' || i.customId === 'channel_reset') &&
                i.user.id === interaction.user.id;

            const collector = interaction.message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'channel_select_add') {
                    if (!i.isStringSelectMenu() || !i.values) return;

                    const selectedChannelId = i.values[0];

                    if (currentChannels.includes(selectedChannelId)) {
                        return await i.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor("Orange")
                                    .setTitle("⚠️ Channel already added")
                                    .setDescription(`The channel <#${selectedChannelId}> is already in the lock list.`)
                            ],
                            ephemeral: true
                        });
                    }

                    currentChannels.push(selectedChannelId);

                    await reactableSchema.updateOne(
                        { _id: reactable._id },
                        { $set: { lockedBehindChannels: currentChannels } }
                    ).exec();

                    collector.stop('restart');
                    await i.update(buildInterface());
                    setupCollectors();

                    await i.followUp({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("✅ Channel Added")
                                .setDescription(`Added <#${selectedChannelId}> to the lock list for **${reactableName}**.`)
                        ],
                        ephemeral: true
                    });

                } else if (i.customId === 'channel_reset') {
                    collector.stop('reset');

                    await reactableSchema.updateOne(
                        { _id: reactable._id },
                        { $set: { lockedBehindChannels: [] } }
                    ).exec();

                    currentChannels.length = 0;

                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("✅ Channel Lock Reset")
                                .setDescription(`Reset all channel locks for **${reactableName}**. This reactable can now fire in any channel.`)
                        ],
                        components: []
                    });
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason !== 'restart' && reason !== 'reset') {
                    interaction.message.edit({ components: [] }).catch(() => {});
                }
            });
        };

        // Setup initial collectors
        setupCollectors();
    }

}

module.exports = new ReactableChecks();