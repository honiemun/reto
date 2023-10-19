const { ChannelType, PermissionsBitField } = require('discord.js');

// Schemas
const guildSchema = require('../schemas/guild');
const reactableSchema = require('../schemas/reactable');
const autoreactSchema = require('../schemas/autoreact');

// Data
const defaultReactables = require('../data/defaultReactables');

const fs = require("fs");
const path = require("path");

class Setup {

    constructor() {
        if (Setup._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Setup._instance = this;
    }
    
    async quickSetup (guild, member, deleteData) {
        // Delete all reactables (emoji, channels, roles) before starting
        await this.startSetupFromScratch(guild, deleteData);

        // Create #best-of channel
        const bestOf = await this.createBestOfChannel(guild);
        
        // Create @Curator role
        const curator = await this.createCuratorRole(guild);
        await this.asignRoleToUser(curator, member);

        // Create default emoji
        await this.createDefaultReactables(guild, bestOf, curator);

        // Store guild data
        this.createGuild({
			guildId: guild.id
		});
    }

    async startSetupFromScratch(guild, deleteData) {
        // Delete pre-existing guild data
        await guildSchema.deleteMany({ guildId: guild.id });
        await autoreactSchema.deleteMany({ guildId: guild.id });

        // Find existing reactables in database
        await reactableSchema.find({ guildId: guild.id}).then(async (reactables) => {
            // Delete all data associated with reactables
            for (const reactable of reactables) {

                // TO-DO: We should check if Reto created these
                // channels / emoji / roles before deleting them
                // (fetch audit logs?)

                if (deleteData) {
                    for (const roleId of reactable.lockedBehindRoles) {
                        const role = guild.roles.cache.find(role => role.id === roleId);
                        if (role) {
                            // TO-DO: This doesn't appear to work.
                            await role.delete();
                        }
                    }
    
                    for (const emojiId of reactable.emojiIds) {
                        const emoji = guild.emojis.cache.find(emoji => emoji.id === emojiId);
                        if (emoji) {
                            try {
                                await emoji.delete();
                            } catch (error) {
                                // This sometimes errors out "Unknown Emoji". No idea why that is, but it shouldn't be a problem.
                                console.log(error);
                            }
                        }
                    }
                }

                await reactable.delete();
            }
        });
        
    }

    async createGuild (guild) {
        const newGuild = new guildSchema(guild);
        return newGuild.save();
    }

    async createReactable (reactable) {
        const newReactables = new reactableSchema(reactable);
        return newReactables.save();
    }

    async createDiscordEmoji (emoji, name, guild) {
        return guild.emojis.create({
            name: `${name}`,
            attachment: `${emoji}`
        });
    }

    async createBestOfChannel (guild) {
        return guild.channels.create({
            name: 'best-of',
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ],
                    deny: [
                        PermissionsBitField.Flags.SendMessages
                    ]
                },
                {
                    id: process.env.CLIENT_ID, // TO-DO: Replace with client.user.id
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.SendMessages
                    ]
                }
            ]
        });
    }

    async createCuratorRole (guild) {
        return guild.roles.create({
            name: 'Curator',
            reason: 'This role allows people who have it to pin (using the :pin:, 📌 or ⭐ emoji) to send messages to the #best-of channel.',
        });
    }

    async createDefaultReactables (guild, bestOf, curator) {
        // TO-DO: Throw error if something goes horribly wrong
        
        for (const emoji of defaultReactables) {
            await this.createDiscordEmoji(emoji.emojiUrl, emoji.name, guild).then((createdEmoji) => {
                // Save new emoji into list
                emoji.emojiIds.push(createdEmoji.id);

                // Add dynamic data for the Best Of
                if (emoji.isBestOf) {
                    emoji.sendsToChannel = bestOf.id;
                    emoji.sendingThreshold = 1;
                    emoji.lockedBehindRoles.push(curator.id);
                }

                this.createReactable({
                    guildId: guild.id,
                    globalKarma: true,
                    
                    name: emoji.name,
                    emojiIds: emoji.emojiIds,
                    karmaAwarded: emoji.karmaAwarded,
                    messageConfirmation: emoji.messageConfirmation,
                    sendsToChannel: emoji.sendsToChannel,
                    sendingThreshold: emoji.sendingThreshold,
                    lockedBehindRoles: emoji.lockedBehindRoles
                });
            });
        }
    }

    async asignRoleToUser (role, member) {
        return member.roles.add(role);
    }

    async setPublicServer (guild) {
        const update = await guildSchema.findOneAndUpdate(
            { guildId: guild.id },
            { $set : { 'public' : true } },
            { upsert: false }
        ).exec();
        
        return update;
    }
}

module.exports = new Setup()