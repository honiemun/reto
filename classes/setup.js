const { ChannelType, PermissionsBitField } = require('discord.js');
const guildSchema = require('../schemas/guild');
const reactableSchema = require('../schemas/reactable');
const defaultReactables = require('../data/defaultReactables');
const cachegoose = require("recachegoose");
const fs = require("fs");
const path = require("path");

class Setup {

    constructor() {
        if (Setup._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Setup._instance = this;
    }
    
    async quickSetup (guild, member) {
        // Delete all reactables (emoji, channels, roles) before starting
        // TO-DO: IMPORTANT!!
        // This is fine for testing but don't actually do this later.
        // Deleting the best-of channel is gonna cause so many people to lose it
        await this.startSetupFromScratch(guild);

        // Create #best-of channel
        const bestOf = await this.createBestOfChannel(guild);
        
        // Create @Curator role
        const curator = await this.createCuratorRole(guild);
        await this.asignRoleToUser(curator, member);

        // Create default emoji
        // TO-DO: Throw error if something goes horribly wrong
        for (const emoji of defaultReactables) {
            await this.createDiscordEmoji(emoji.emojiUrl, emoji.name, guild).then((createdEmoji) => {
                // Save new emoji into list
                emoji.emojiIds.push(createdEmoji.id);

                // Add dynamic data for the Best Of
                if (emoji.isBestOf) {
                    emoji.sendsToChannel = bestOf.id;
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
                    lockedBehindRoles: emoji.lockedBehindRoles
                });
            });
        }

        // Store guild data
        this.createGuild({
			guildId: guild.id
		});
    }

    async startSetupFromScratch(guild) {
        // Delete pre-existing guild data
        await guildSchema.deleteMany({ guildId: guild.id });
        cachegoose.clearCache(guild.id + '-guild');

        // Find existing reactables in database
        await reactableSchema.find({ guildId: guild.id}).then(async (reactables) => {
            // Delete all channels associated with reactables
            for (const reactable of reactables) {
                if (reactable.sendsToChannel) {
                    const channel = guild.channels.cache.find(channel => channel.id === reactable.sendsToChannel);
                    if (channel) {
                        await channel.delete();
                    }
                }

                for (const roleId of reactable.lockedBehindRoles) {
                    const role = guild.roles.cache.find(role => role.id === roleId);
                    if (role) {
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

    async asignRoleToUser (role, member) {
        return member.roles.add(role);
    }

    async setPublicServer (guild) {
        const update = await guildSchema.updateOne({ guildId: guild.id }, {
            public: true
        });
        cachegoose.clearCache(guild + '-guild');
        
        return update;
    }
}

module.exports = new Setup()