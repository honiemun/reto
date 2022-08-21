import { Guild, GuildMember, Role, User } from 'discord.js';
import guildSchema from '../schemas/guild';
import reactableSchema from '../schemas/reactable';
import { defaultEmojis } from '../data/defaultEmojis';
import dotenv from 'dotenv';
import guild from '../schemas/guild';

export default class Setup {

    static async quickSetup (guild: Guild, member: GuildMember) {
        console.log(guild.id);
        // Delete all reactables (emoji, channels, roles) before starting
        await this.startSetupFromScratch(guild);

        // Create #best-of channel
        const bestOf = await this.createBestOfChannel(guild);
        
        // Create @Curator role
        const curator = await this.createCuratorRole(guild);
        await this.asignRoleToUser(curator, member);

        // Create default emoji
        // TO-DO: Throw error if something goes horribly wrong
        for (const emoji of defaultEmojis) {
            await Setup.createDiscordEmoji(emoji.emojiUrl, emoji.name, guild).then((createdEmoji) => {
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

    static async startSetupFromScratch(guild: Guild) {
        // Delete pre-existing guild data
        await guildSchema.deleteMany({ guildId: guild.id });

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

    static async createGuild (guild: Object) {
        const newGuild = new guildSchema(guild);
        return newGuild.save();
    }

    static async createReactable (reactable: Object) {
        const newReactables = new reactableSchema(reactable);
        return newReactables.save();
    }

    static async createDiscordEmoji (emoji: any, name: string, guild: Guild) {
        return guild.emojis.create(emoji, name);
    }

    static async createBestOfChannel (guild: Guild) {
        return guild.channels.create('best-of', {
            type: "GUILD_TEXT",
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
                    deny: ['SEND_MESSAGES']
                },
                {
                    id: process.env.CLIENT_ID!, // TO-DO: Replace with client.user.id
                    allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY', 'SEND_MESSAGES']
                }
            ]
        });
    }

    static async createCuratorRole (guild: Guild) {
        return guild.roles.create({
            name: 'Curator',
            reason: 'This role allows people who have it to pin (using the :pin:, 📌 or ⭐ emoji) to send messages to the #best-of channel.',
        });
    }

    static async asignRoleToUser (role: Role, member: GuildMember) {
        return member.roles.add(role);
    }

    static async setPublicServer (guild: Guild) {
        const update = await guildSchema.updateOne({ guildId: guild.id }, {
            public: true
        });

        console.log(guild.id);
        console.log(update);
        return update;
    }
}