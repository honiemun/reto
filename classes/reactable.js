const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const mongoose = require('mongoose');

// Classes
const Embed = require("../classes/embed");
const Parsing = require("../classes/parsing");

// Schemas
const guildSchema = require("../schemas/guild");
const reactableSchema = require("../schemas/reactable");

class Reactable {

    constructor() {
        if (Reactable._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Reactable._instance = this;
    }

    async editDefaultEmoji(interaction, reactable) {
		const reactableName = interaction.options.getString("reactable").charAt(0).toUpperCase() + interaction.options.getString("reactable").slice(1);
		
		const collector = await Embed.createDefaultEmojiSelectorEmbed(interaction, reactable, reactableName);

		collector.on('collect', async i => {

            await this.pushEmojiToFront(i.values[0], reactable);

            // Send confirmation
            const emoji = await Parsing.emoji(i.values[0], interaction.guild);
            
			await interaction.editReply({ embeds: [ new EmbedBuilder()
				.setColor("Green")
				.setTitle("✅ Default emoji updated!")
				.setDescription("The new emoji shown as the default for **" + reactableName + "** is now " + emoji + ".")
			], components: []});
		});
    }

    async pushEmojiToFront(emoji, reactable) {
        // Find the index of the element with the given string
        let emojiList = reactable.emojiIds;
        const index = emojiList.findIndex(item => item.includes(emoji));
        if (!index) return;

        const removedElement = emojiList.splice(index, 1)[0];
        emojiList.unshift(removedElement);

        reactableSchema.updateOne(
            { _id: reactable._id },
            { $set: {
                'emojiIds': emojiList}
            },
			{ upsert: false }
		).exec();
    }

    async addEmoji(interaction, reactable) {
        const reactableName = interaction.options.getString("reactable").charAt(0).toUpperCase() + interaction.options.getString("reactable").slice(1);
        const emoji = interaction.options.getString("emoji");

        // Check if emoji is already in the list
        if (reactable.emojiIds.includes(emoji)) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("⚠️ Emoji already exists")
                        .setDescription("The emoji " + emoji + " is already part of this reactable.")
                ]
            });
        }

        // Add emoji to reactable
        reactable.emojiIds.push(emoji);
        
        await reactableSchema.updateOne(
            { _id: reactable._id },
            { $set: { emojiIds: reactable.emojiIds } }
        ).exec();

        // Convert all emoji IDs to their proper emoji strings for display
        const displayEmojis = await Promise.all(
            reactable.emojiIds.map(id => Parsing.emoji(id, interaction.guild))
        );
        const updatedEmojisText = displayEmojis.join(" ");

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Emoji added!")
                    .setDescription("Added " + emoji + " to **" + reactableName + "**.\n\n**Current emojis:**\n" + updatedEmojisText)
            ]
        });
    }

    async removeEmoji(interaction, reactable) {
        const reactableName = interaction.options.getString("reactable").charAt(0).toUpperCase() + interaction.options.getString("reactable").slice(1);
        const emoji = interaction.options.getString("emoji");

        // Check if emoji exists in the list
        if (!reactable.emojiIds.includes(emoji)) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("⚠️ Emoji not found")
                        .setDescription("The emoji " + emoji + " is not part of this reactable.")
                ]
            });
        }

        // Remove emoji from reactable
        reactable.emojiIds = reactable.emojiIds.filter(e => e !== emoji);
        
        await reactableSchema.updateOne(
            { _id: reactable._id },
            { $set: { emojiIds: reactable.emojiIds } }
        ).exec();

        // Convert all emoji IDs to their proper emoji strings for display
        const displayEmojis = await Promise.all(
            reactable.emojiIds.map(id => Parsing.emoji(id, interaction.guild))
        );
        const updatedEmojisText = reactable.emojiIds.length > 0 
            ? displayEmojis.join(" ")
            : "No emojis assigned";

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Emoji removed!")
                    .setDescription("Removed " + emoji + " from **" + reactableName + "**.\n\n**Current emojis:**\n" + updatedEmojisText)
            ]
        });
    }

    async createReactable(interaction) {
        const name = interaction.options.getString("name").toLowerCase();
        let emoji = interaction.options.getString("emoji");

        // Extract emoji ID from format, or just use as-is if it's already an ID
        const emojiMatch = emoji.match(/:(\d+)>/);
        if (emojiMatch) {
            emoji = emojiMatch[1];
        }

        // Check if reactable with this name already exists
        const existingReactable = await reactableSchema.findOne({
            guildId: interaction.guild.id,
            name: name
        }).exec();

        if (existingReactable) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("⚠️ Reactable already exists")
                        .setDescription("A reactable named **" + name + "** already exists on this server.")
                ]
            });
        }

        // Create the new reactable
        try {
            const newReactable = new reactableSchema({
                guildId: interaction.guild.id,
                name: name,
                emojiIds: [emoji]
            });

            await newReactable.save();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Reactable created!")
                        .setDescription("Successfully created the **" + name + "** reactable with emoji " + emoji + ".\n\n- Reactables don't do much on their own, set up some actions to trigger when you react to a message with it by using `/reactable actions set`!\n- You can control who has access to this reactable by using `/reactable checks set`.\n- Want to add more emoji to this reactable? Use `/reactable emoji add`, or `/reactable emoji default` to set the default one.")
                ]
            });
        } catch (error) {
            console.error("💔 Error creating reactable:", error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Error creating reactable")
                        .setDescription("There was an error creating the reactable. Please try again.")
                ]
            });
        }
    }

    async deleteReactable(interaction) {
        const reactableName = interaction.options.getString("reactable");
        
        const reactable = await reactableSchema.findOne({
            guildId: interaction.guild.id,
            name: reactableName.toLowerCase()
        }).exec();

        if (!reactable) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("⚠️ Reactable not found")
                        .setDescription("A reactable named **" + reactableName + "** wasn't found on this server.")
                ]
            });
        }

        // Create confirmation buttons
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_delete')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_delete')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Orange")
                    .setTitle("⚠️ Confirm deletion")
                    .setDescription("Are you sure you want to delete the **" + reactableName + "** reactable?\n\n**This will permanently delete all associated data including:**\n• All reactions stored for this reactable\n• All pinned messages sent by this reactable\n• All settings and configurations\n\nThis action cannot be undone.")
            ],
            components: [confirmRow]
        });

        // Create button collector
        const filter = i => i.customId === 'confirm_delete' || i.customId === 'cancel_delete';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_delete') {
                try {
                    await reactableSchema.deleteOne({ _id: reactable._id }).exec();

                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("✅ Reactable deleted!")
                                .setDescription("Successfully deleted the **" + reactableName + "** reactable.")
                        ],
                        components: []
                    });
                } catch (error) {
                    console.error("💔 Error deleting reactable:", error);
                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Red")
                                .setTitle("❌ Error deleting reactable")
                                .setDescription("There was an error deleting the reactable. Please try again.")
                        ],
                        components: []
                    });
                }
            } else if (i.customId === 'cancel_delete') {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Blue")
                            .setTitle("❌ Cancelled")
                            .setDescription("Deletion cancelled. The **" + reactableName + "** reactable has not been deleted.")
                    ],
                    components: []
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Grey")
                            .setTitle("⏱️ Confirmation timed out")
                            .setDescription("The deletion request has expired. Please try again if you want to delete this reactable.")
                    ],
                    components: []
                }).catch(() => {});
            }
        });
    }
}

module.exports = new Reactable();