const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
        StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
        ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");

// Classes
const ReactableEmbeds = require("./reactableEmbeds");

class ReactableChecks extends ReactableEmbeds {

    constructor() {
        super();
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
        await this.modalInput(interaction, reactable, {
            modalId:            'threshold_modal',
            modalTitle:         'Edit Reaction Threshold',
            inputId:            'threshold_value',
            inputLabel:         'Reaction Threshold',
            inputPlaceholder:   'Enter a number (0 = disabled)',
            currentValue:       reactable.reactionThreshold || 0,
            validate:           'positiveInt',
            dbField:            'reactionThreshold',
            successTitle:       '✅ Reaction Threshold Updated',
            successDescription: (v) => `The reaction threshold for **${reactableName}** is now set to **${v}**.`
        });
    }

    async editFiresOnce(interaction, reactable, reactableName) {
        await this.booleanToggle(interaction, reactable, {
            enableId:           'fires_once_true',
            disableId:          'fires_once_false',
            enableStyle:        ButtonStyle.Success,
            disableStyle:       ButtonStyle.Danger,
            dbField:            'firesOnce',
            embedTitle:         'Edit Fires Once',
            embedDescription:   'Should this reactable only work once per message?',
            embedColor:         'Blue',
            currentValue:       reactable.firesOnce || false,
            successTitle:       '✅ Fires Once Updated',
            successDescription: (v) => `The **${reactableName}** reactable will ${v ? '**now**' : '**no longer**'} fire only once per message.`
        });
    }

    async editSelfReact(interaction, reactable, reactableName) {
        await this.booleanToggle(interaction, reactable, {
            enableId:           'self_react_true',
            disableId:          'self_react_false',
            enableStyle:        ButtonStyle.Success,
            disableStyle:       ButtonStyle.Danger,
            dbField:            'selfReaction',
            embedTitle:         'Edit Self React',
            embedDescription:   'Should users be able to react to their own messages with this reactable?',
            embedColor:         'Blue',
            currentValue:       reactable.selfReaction || false,
            successTitle:       '✅ Self React Updated',
            successDescription: (v) => `Users will ${v ? '**now**' : '**no longer**'} be able to react to their own messages with **${reactableName}**.`
        });
    }

    async editLockedRoles(interaction, reactable, reactableName) {
        const guild = interaction.guild;

        // Fetch fresh roles from Discord before reading cache
        await guild.roles.fetch();

        const roleOptions = Array.from(guild.roles.cache
            .filter(role => role.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .values()
        ).map(role => ({ label: role.name, value: role.id }));

        await this.paginatedMultiSelect(interaction, reactable, {
            selectorId:          'role_select_add',
            selectorPlaceholder: 'Select a role to add',
            options:             roleOptions,
            resetId:             'role_reset',
            resetLabel:          'Reset All Roles',
            dbField:             'lockedBehindRoles',
            currentValues:       reactable.lockedBehindRoles || [],
            embedTitle:          'Edit Locked Behind Roles',
            embedColor:          'Green',
            emptyDescription:    'No roles are currently locked. Select roles to add access restrictions.',
            filledDescription:   'Select a role to add to the lock list, or reset all roles.',
            currentValuesLabel:  'Currently Locked Roles',
            formatValue:         (id) => {
                const role = guild.roles.cache.get(id);
                return role ? `<@&${id}>` : `Unknown Role (${id})`;
            },
            duplicateTitle:       '⚠️ Role already locked',
            duplicateDescription: (v) => `The role <@&${v}> is already in the lock list.`,
            addedTitle:           '✅ Role Added',
            addedDescription:     (v) => `Added <@&${v}> to the lock list for **${reactableName}**.`,
            resetTitle:           '✅ Role Lock Reset',
            resetDescription:     `Reset all role locks for **${reactableName}**. This reactable can now be used by anyone.`
        });
    }

    async editLockedChannels(interaction, reactable, reactableName) {
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

        await this.paginatedMultiSelect(interaction, reactable, {
            selectorId:          'channel_select_add',
            selectorPlaceholder: 'Select a channel to add',
            options:             channelOptions,
            resetId:             'channel_reset',
            resetLabel:          'Reset All Channels',
            dbField:             'lockedBehindChannels',
            currentValues:       reactable.lockedBehindChannels || [],
            embedTitle:          'Edit Locked Behind Channels',
            embedColor:          'Blue',
            emptyDescription:    'No channels are currently locked. Select channels to restrict where this reactable can be used.',
            filledDescription:   'Select a channel to add to the lock list, or reset all channels.',
            currentValuesLabel:  'Currently Locked Channels',
            formatValue:         (id) => {
                const channel = guild.channels.cache.get(id);
                return channel ? `<#${id}>` : `Unknown Channel (${id})`;
            },
            duplicateTitle:       '⚠️ Channel already added',
            duplicateDescription: (v) => `The channel <#${v}> is already in the lock list.`,
            addedTitle:           '✅ Channel Added',
            addedDescription:     (v) => `Added <#${v}> to the lock list for **${reactableName}**.`,
            resetTitle:           '✅ Channel Lock Reset',
            resetDescription:     `Reset all channel locks for **${reactableName}**. This reactable can now fire in any channel.`
        });
    }
}

module.exports = new ReactableChecks();