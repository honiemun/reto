const { ChannelType, PermissionsBitField } = require('discord.js');

// Schemas
const guildSchema = require('../schemas/guild');
const reactableSchema = require('../schemas/reactable');
const autoreactSchema = require('../schemas/autoreact');

// Data
const defaultReactables = require('../data/defaultReactables');
const reactablePacks = require('../data/reactablePacks');

const fs = require("fs");
const path = require("path");

class Setup {

    constructor() {
        if (Setup._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Setup._instance = this;
        this.SetupCache = [];
    }
    
    async quickSetup (guild, member, deleteData) {
        // Delete all reactables (emoji, channels, roles) before starting
        await this.startSetupFromScratch(guild, deleteData);

        // Create #best-of channel
        const bestOf = await this.createBestOfChannel(guild);
        
        // Create @Curator role
        const curator = await this.createCuratorRole(guild);
        await this.assignRoleToUser(curator, member);

        // Create default emoji
        await this.createDefaultReactables(guild, bestOf, curator);

        // Store guild data
        this.createGuild(guild);
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
		return await guildSchema.findOneAndUpdate(
			{
				guildId: guild.id
			},
            {
                $setOnInsert: {
                    guildId: guild.id
                }
            },
			{ upsert: true }
		).exec();
    }

    async createReactable (reactable) {
		return await reactableSchema.findOneAndUpdate(
			{
				guildId: reactable.guildId,
				name: reactable.name
			},
			{
				$set: reactable
			},
			{ upsert: true }
		).exec();
    }

    async createDiscordEmoji (emoji, name, guild) {
        return guild.emojis.create({
            name: `${name}`,
            attachment: `${emoji}`
        });
    }

    async setPinnableChannel(components, guild) {
        let channel = components[0]; 

        if (components[0] == "createBestOf") {
            const bestOf = await this.createBestOfChannel(guild);
            channel = bestOf.id;
        }

        // Set into cache
        await this.saveToSetupCache("channel", channel, guild);
    }

    async setRoleLock(components, guild, member) {
        const reactable = this.SetupCache[guild.id].pin; // If we added something else that uses role lock, this should be refactored
        let roleList = [];

        // Define and create roles
        for (const role of components) {
            if (role == "createCurator") {
                const curator = await this.createCuratorRole(guild);
                await this.assignRoleToUser(curator, member);
                roleList.push(curator.id);
            } else {
                roleList.push(role);
            }
        }

        // Modify Reactable to add role locks
        return await reactableSchema.findOneAndUpdate(
            {
                _id: reactable._id
            },
            {
                $set: {
                    lockedBehindRoles: roleList
                }
            },
            { upsert: false }
        ).exec();
    }
    
    async setPublicServer (guild, enable) {
        const update = await guildSchema.findOneAndUpdate(
            { guildId: guild.id },
            { $set : { public : enable } },
            { upsert: false }
        ).exec();
        
        return update;
    }
    
    async setNewsletterSubscription (guild, enable) {
        const update = await guildSchema.findOneAndUpdate(
            { guildId: guild.id },
            { $set : { subscribedToNewsletter : enable } },
            { upsert: false }
        ).exec();
        
        return update;
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
                emoji.emojiIds.unshift(createdEmoji.id);
            });

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
        }
    }

    async createCustomReactable (reactableType, components, guild) {
        let emoji = defaultReactables.filter(obj => obj.name === reactableType)[0];
        if (!emoji) return;

        let emojiIds = [];
        let customEmojiCreated = 0;
        let sendsToChannel = undefined;

        // Create Discord emoji
        for (const component of components) {
            if (/<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu.test(component) || !isNaN(component)) {
                // If the emoji is a default Unicode emoji or an existing Discord emoji (ID), just add to list
                emojiIds.push(component);
            } else {
                // If the emoji is part of a Pack, create the emoji
                const emojiImage = reactablePacks[component].images[reactableType];
                const emojiName = customEmojiCreated == 0 ? reactableType : component + reactableType;
                if (!emojiImage) continue;
                
                // Delete emoji with the same name if it already exists
                const emoji = guild.emojis.cache.find(emoji => emoji.name === emojiName);
                if (emoji) {
                    try {
                        await emoji.delete();
                    } catch (error) {
                        console.log(error);
                    }
                }

                customEmojiCreated += 1;
                await this.createDiscordEmoji(emojiImage, emojiName, guild).then((createdEmoji) => {
                    emojiIds.push(createdEmoji.id);
                })
            }
        }

        // Define Best Of channel
        if (emoji.isBestOf) {
            sendsToChannel = this.SetupCache[guild.id].channel;
        }

        // Create Reactable
        const reactable = await this.createReactable({
            guildId: guild.id,
            globalKarma: true,
            
            name: emoji.name,
            emojiIds: emojiIds,
            karmaAwarded: emoji.karmaAwarded,
            messageConfirmation: emoji.messageConfirmation,
            sendsToChannel: sendsToChannel,
            sendingThreshold: emoji.sendingThreshold,
            lockedBehindRoles: emoji.lockedBehindRoles
        });

        console.log(emojiIds);
        console.log(reactable);

        // Save to cache
        await this.saveToSetupCache(reactableType, reactable, guild);
    }

    async saveToSetupCache(key, value, guild) {
        if (!this.SetupCache[guild.id]) {
            this.SetupCache[guild.id] = {};
        }

        this.SetupCache[guild.id][key] = value;
        console.log(this.SetupCache); // TO-DO: Remove !!
    }
    
    async assignRoleToUser (role, member) {
        return member.roles.add(role);
    }
}

module.exports = new Setup()