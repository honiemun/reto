const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
        StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
        ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");

// Classes
const ReactableEmbeds = require("./reactableEmbeds");

class ReactableActions extends ReactableEmbeds {

    constructor() {
        super();
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
        await this.modalInput(interaction, reactable, {
            modalId:            'karma_modal',
            modalTitle:         'Edit Karma Awarded',
            inputId:            'karma_value',
            inputLabel:         'Karma Amount',
            inputPlaceholder:   'Enter a number (can be negative)',
            currentValue:       reactable.karmaAwarded || 0,
            validate:           'number',
            dbField:            'karmaAwarded',
            successTitle:       '✅ Karma Awarded Updated',
            successDescription: (v) => `The **${reactableName}** reactable will now award **${v}** karma.`
        });
    }

    async editDeletesMessage(interaction, reactable, reactableName) {
        await this.booleanToggle(interaction, reactable, {
            enableId:           'delete_msg_true',
            disableId:          'delete_msg_false',
            enableStyle:        ButtonStyle.Danger,
            disableStyle:       ButtonStyle.Secondary,
            enableLabel:        'Enable',
            disableLabel:       'Disable',
            dbField:            'deletesMessage',
            embedTitle:         'Edit Deletes Message',
            embedDescription:   'Should the original message be deleted when this reactable is used?',
            embedColor:         'Green',
            currentValue:       reactable.deletesMessage || false,
            successTitle:       '✅ Deletes Message Updated',
            successDescription: (v) => `The **${reactableName}** reactable will ${v ? '**now**' : '**no longer**'} delete the original message.`
        });
    }

    async editSendsToChannel(interaction, reactable, reactableName) {
        const guild = interaction.guild;

        // Fetch fresh channels from Discord before reading cache
        await guild.channels.fetch();

        const channelOptions = Array.from(guild.channels.cache
            .filter(channel =>
                channel.type === ChannelType.GuildText ||
                channel.type === ChannelType.GuildAnnouncement
            )
            .sort((a, b) => a.position - b.position)
            .values()
        ).map(channel => ({ label: channel.name, value: channel.id }));

        // Format current channel display text
        let currentChannelText = "None";
        if (reactable.sendsToChannel) {
            const currentChannel = guild.channels.cache.get(reactable.sendsToChannel);
            currentChannelText = currentChannel
                ? `<#${reactable.sendsToChannel}>`
                : `Unknown Channel (${reactable.sendsToChannel})`;
        }

        await this.paginatedSelect(interaction, reactable, {
            selectorId:           'channel_select',
            selectorPlaceholder:  'Select a channel to send pinned messages to',
            options:              channelOptions,
            disableId:            'channel_disable',
            disableLabel:         'Disable Channel Sending',
            disableEnabled:       !!reactable.sendsToChannel,
            dbField:              'sendsToChannel',
            embedTitle:           'Edit Sends To Channel',
            embedDescription:     'Select which channel pinned messages should be sent to, or disable channel sending.',
            embedColor:           'Green',
            currentValueLabel:    'Current Channel',
            currentValueText:     currentChannelText,
            successTitle:         '✅ Channel Updated',
            successDescription:   (v) => `Pinned messages from **${reactableName}** will now be sent to <#${v}>.`,
            disabledTitle:        '✅ Channel Sending Disabled',
            disabledDescription:  `**${reactableName}** will no longer send pinned messages to any channel.`,
            emptyTitle:           '❌ No channels available',
            emptyDescription:     'There are no text channels on this server to send messages to.'
        });
    }

    async editTimeout(interaction, reactable, reactableName) {
        await this.modalInput(interaction, reactable, {
            modalId:            'timeout_modal',
            modalTitle:         'Edit Timeout',
            inputId:            'timeout_value',
            inputLabel:         'Timeout Author Duration',
            inputPlaceholder:   'Enter timeout in seconds (0 to disable)',
            currentValue:       reactable.timeout || 0,
            validate:           'number',
            dbField:            'timeout',
            successTitle:       '✅ Timeout Author Updated',
            successDescription: (v) => {
                const statusText = v === 0 ? "disabled" : `set to ${v} seconds`;
                return `The **${reactableName}** reactable timeout has been **${statusText}**.`;
            }
        });
    }

    async editReply(interaction, reactable, reactableName) {
        // editReply uses a confirm/disable flow after the modal, so it stays custom
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

        if (currentValue) replyInput.setValue(currentValue);

        const actionRow = new ActionRowBuilder().addComponents(replyInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({ time: 900000 });
            const newValue = submitted.fields.getTextInputValue('reply_value') || "";

            // If empty, disable replies directly without confirmation
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

            // Show confirm/disable buttons before saving
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
                        .addFields({ name: "New Reply", value: "```\n" + newValue + "\n```" })
                ],
                components: [buttonRow],
                ephemeral: true
            });

            const filter = i => (i.customId === 'confirm_reply' || i.customId === 'disable_reply') && i.user.id === interaction.user.id;
            const buttonCollector = submitted.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

            buttonCollector.on('collect', async buttonInteraction => {
                if (buttonInteraction.customId === 'disable_reply') {
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

        // Fetch fresh roles from Discord before reading cache
        await guild.roles.fetch();

        const roleOptions = Array.from(guild.roles.cache
            .filter(role => !role.managed && role.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .values()
        ).map(role => ({ label: role.name, value: role.id }));

        // Format current role display text
        let currentRoleText = "None";
        if (reactable.awardedRole) {
            const currentRole = guild.roles.cache.get(reactable.awardedRole);
            currentRoleText = currentRole
                ? `<@&${reactable.awardedRole}>`
                : `Unknown Role (${reactable.awardedRole})`;
        }

        await this.paginatedSelect(interaction, reactable, {
            selectorId:           'role_select',
            selectorPlaceholder:  'Select a role to award to message author',
            options:              roleOptions,
            disableId:            'role_disable',
            disableLabel:         'Remove Role',
            disableEnabled:       !!reactable.awardedRole,
            dbField:              'awardedRole',
            embedTitle:           'Edit Give Role to Author',
            embedDescription:     'Select which role to award to the original message author.',
            embedColor:           'Green',
            currentValueLabel:    'Current Role',
            currentValueText:     currentRoleText,
            successTitle:         '✅ Role Updated',
            successDescription:   (v) => `The **${reactableName}** reactable will now award the <@&${v}> role.`,
            successFooter:        'Make sure the bot has a role above the one you selected before using this reactable.', // TO-DO: Add a check for this
            disabledTitle:        '✅ Role Removed',
            disabledDescription:  `The **${reactableName}** reactable will no longer award a role.`,
            emptyTitle:           '❌ No roles available',
            emptyDescription:     'There are no manageable roles on this server.'
        });
    }

    async editReactorAwardedRole(interaction, reactable, reactableName) {
        const guild = interaction.guild;

        // Fetch fresh roles from Discord before reading cache
        await guild.roles.fetch();

        const roleOptions = Array.from(guild.roles.cache
            .filter(role => !role.managed && role.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .values()
        ).map(role => ({ label: role.name, value: role.id }));

        // Format current role display text
        let currentRoleText = "None";
        if (reactable.reactorAwardedRole) {
            const currentRole = guild.roles.cache.get(reactable.reactorAwardedRole);
            currentRoleText = currentRole
                ? `<@&${reactable.reactorAwardedRole}>`
                : `Unknown Role (${reactable.reactorAwardedRole})`;
        }

        await this.paginatedSelect(interaction, reactable, {
            selectorId:           'reactor_role_select',
            selectorPlaceholder:  'Select a role to award to reactors',
            options:              roleOptions,
            disableId:            'reactor_role_disable',
            disableLabel:         'Remove Role',
            disableEnabled:       !!reactable.reactorAwardedRole,
            dbField:              'reactorAwardedRole',
            embedTitle:           'Edit Give Role to Reactor',
            embedDescription:     'Select which role to award to users who react with this reactable.',
            embedColor:           'Green',
            currentValueLabel:    'Current Role',
            currentValueText:     currentRoleText,
            successTitle:         '✅ Role Updated',
            successDescription:   (v) => `Reactors with the **${reactableName}** reactable will now receive the <@&${v}> role.`,
            successFooter:        'Make sure the bot has a role above the one you selected before using this reactable.', // TO-DO: Add a check for this
            disabledTitle:        '✅ Role Removed',
            disabledDescription:  `Reactors will no longer receive a role from the **${reactableName}** reactable.`,
            emptyTitle:           '❌ No roles available',
            emptyDescription:     'There are no manageable roles on this server.'
        });
    }

    async editReactionEmoji(interaction, reactable, reactableName) {
        await this.reactionEmojiInput(interaction, reactable, {
            disableId:           'emoji_disable',
            disableLabel:        'Disable Reaction Emoji',
            dbField:             'reactionEmoji',
            embedTitle:          'Set Reaction Emoji',
            embedDescription:    "React to this message with the emoji you'd like to use, or press the button below to disable.",
            embedColor:          'Green',
            successTitle:        '✅ Reaction Emoji Updated',
            successDescription:  (reaction) => `The **${reactableName}** reactable will now react with: ${reaction.emoji}`,
            disabledTitle:       '✅ Reaction Emoji Disabled',
            disabledDescription: `The **${reactableName}** reactable will no longer react with an emoji.`
        });
    }

    async editKicksUser(interaction, reactable, reactableName) {
        await this.booleanToggle(interaction, reactable, {
            enableId:           'kicks_true',
            disableId:          'kicks_false',
            enableStyle:        ButtonStyle.Danger,
            disableStyle:       ButtonStyle.Secondary,
            enableLabel:        'Enable',
            disableLabel:       'Disable',
            dbField:            'kicksUser',
            embedTitle:         'Edit Kicks Author',
            embedDescription:   'Should the original message author be kicked when this reactable is used?',
            embedColor:         'Green',
            currentValue:       reactable.kicksUser || false,
            successTitle:       '✅ Kicks Author Updated',
            successDescription: (v) => `The **${reactableName}** reactable will ${v ? '**now**' : '**no longer**'} kick the original message author.`,
            successFooter:      'Make sure the bot has the Kick Members permission on this server before using this reactable.'
        });
    }

    async editBansUser(interaction, reactable, reactableName) {
        await this.booleanToggle(interaction, reactable, {
            enableId:           'bans_true',
            disableId:          'bans_false',
            enableStyle:        ButtonStyle.Danger,
            disableStyle:       ButtonStyle.Secondary,
            enableLabel:        'Enable',
            disableLabel:       'Disable',
            dbField:            'bansUser',
            embedTitle:         'Edit Bans User',
            embedDescription:   'Should the original message author be banned when this reactable is used?',
            embedColor:         'Green',
            currentValue:       reactable.bansUser || false,
            successTitle:       '✅ Bans User Updated',
            successDescription: (v) => `The **${reactableName}** reactable will ${v ? '**now**' : '**no longer**'} ban the original message author.`,
            successFooter:      'Make sure the bot has the Ban Members permission on this server before using this reactable.'
        });
    }
}

module.exports = new ReactableActions();