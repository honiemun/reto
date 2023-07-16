const { ActionRowBuilder, ButtonBuilder } = require('discord.js');

// Schemas
const messageSchema = require('../schemas/message');
const pinnedEmbedSchema = require('../schemas/pinnedEmbed');
const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');

// Classes
const ReactionCheck = require("./reactionCheck")
const Personalisation = require("./personalisation");

class Pin {
    
    constructor() {
        if (Pin._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Pin._instance = this;
    }

    async pinMessageToChannel(message, reactable, client, isPositive, user = false) {
        if (!message) return;

        // Check if previously reacted
        if (user) {
            const hasReacted = await ReactionCheck.checkIfPreviouslyReacted(message, user, reactable);
            if (!hasReacted && isPositive) {
                // TO-DO: Remove this user's pinned post if this is the last star.
                // Would require checking for the reactions of the post
                return;
            }
        }

        // We use this multiple times, better call it at the beginning
        const messageDocument = await messageSchema.findOne({
            messageId: message.id
        }).exec();

        const embed          = await this.generateMessageEmbed(message);
        const karmaString    = await this.getKarmaTotalString(message, messageDocument);
        
        // Get the channel to send/edit the message into
        const iterableChannels = await this.getIterableChannels(messageDocument, reactable);
        if (!iterableChannels) return;

        for (const iterableChannel of iterableChannels) {
            client.channels.fetch(iterableChannel.id).then((channel) => {
    
                // Attach a Jump to message button
                const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Jump to message')
                        .setStyle("Link")
                        .setURL(message.url)
                );
                
                // Send or edit message.
                // TO-DO: SPLIT INTO ANOTHER FUNCTION !!
                if (!iterableChannel.edit) {
                    channel.send({ content: karmaString, embeds: embed, components: [row] }).then((sentEmbed) => {
                        this.storePinnedEmbed(sentEmbed, messageDocument);
                    })
                } else {
                    channel.messages.fetch(iterableChannel.embed).then((pinnedMessage) => {
                        pinnedMessage.edit({ content: karmaString, embeds: embed, components: [row] })
                    })
                }
            });
        }
    }

    async deleteMessage(message, client) {
        // Remove the user's karma from that message
        const databaseMessage = await messageSchema.findOne({ messageId: message.id }).exec();
        if (!databaseMessage) return; // Ignore all messages not on the DB.
        
        if (databaseMessage.karma != 0) {
            await userSchema.findOneAndUpdate(
                { userId: databaseMessage.userId },
                { $inc : { 'globalKarma' : -databaseMessage.karma } },
                { upsert: true }
            ).exec();
    
            await memberSchema.findOneAndUpdate(
                { userId: databaseMessage.userId, guildId: message.guildId },
                { $inc : { 'karma' : -databaseMessage.karma } },
                { upsert: true }
            ).exec();
        }

        // Delete the message from the database
        await databaseMessage.deleteOne();

        // Delete all pinned messages (database and Discord)
        const iterableChannels = await this.getIterableChannels(databaseMessage, false);
        if (!iterableChannels) return;

        for (const iterableChannel of iterableChannels) {
            client.channels.fetch(iterableChannel.id).then(channel => {
                try {
                    channel.messages.delete(iterableChannel.embed);
                } catch (e) {
                    console.log("❌ Couldn't delete pinned message! ".red + "(ID: ".gray + iterableChannel.embed.gray + ")".gray)
                }

                pinnedEmbedSchema.findOneAndRemove({
                    pinnedEmbedId: message.id
                }).exec();
            });
        }

    }

    async getIterableChannels(dbMessage, reactable) {
        const pinnedMessages = await this.getAttachedPinnedMessages(dbMessage);
        let iterableChannels = [];

         if (pinnedMessages.length > 0) {
            for (const pinnedMessage of pinnedMessages) iterableChannels.push({
                id: pinnedMessage.channelId,
                embed: pinnedMessage.pinnedEmbedId,
                edit: true
            });
        } if (reactable.sendsToChannel) {
            iterableChannels.push({
                id: reactable.sendsToChannel,
                embed: "",
                edit: false
            });
        }
        
        if (iterableChannels.length == 0) return;

        return iterableChannels;
    }
    
    async generateMessageEmbed(message) {
        // Generate default message embed
        let messageEmbed = {
            url: "https://retobot.com", // Necessary for multiple image support
            description: message.content ? message.content : undefined,
            timestamp: new Date().toISOString(),
            fields: []
        };

        // Optional fields
        messageEmbed.author = await this.setEmbedAuthor(message);
        messageEmbed.footer = await this.setEmbedFooter(message);
        messageEmbed.color  = await this.setEmbedColor(message);
        messageEmbed.image  = await this.setEmbedSingleImage(message);

        messageEmbed.fields = await this.parseEmbedIntoFields(message);
        const embedReply = await this.setEmbedReply(message); // I pray to the Typescript gods above to forgive me for such ingenuity
        if (message.reference && embedReply) messageEmbed.fields.push(embedReply);
        
        let embedArray = await this.setEmbedImages(message, messageEmbed.url);
        embedArray.unshift(messageEmbed)

        return embedArray;
    }

    async storePinnedEmbed(sentEmbed, messageDb) {
        new pinnedEmbedSchema({
            pinnedEmbedId: sentEmbed.id,
            channelId: sentEmbed.channel.id,
            message: messageDb._id
        }).save().then((pinnedEmbed) => {
            messageSchema.findOneAndUpdate(
                { messageId: messageDb.messageId },
                { $push: { 'pinnedEmbeds': pinnedEmbed._id } },
                { upsert: true, new: true }
            ).exec();
        });
    }

    // Fetches the message attached to a pinnedEmbed object on the database.
    async getStoredPinnedMessage(message) {
        // TO-DO: Maybe better optimised with a populate function.
        const pinnedEmbed = await pinnedEmbedSchema.findOne({
            pinnedEmbedId: message.id
        }).exec();

        if (!pinnedEmbed) return null;
        
        return await messageSchema.findOne({
            _id: pinnedEmbed.message
        }).exec();
    }

    // Fetches the array of pinnedEmbeds attached to a message object.
    async getAttachedPinnedMessages(dbMessage) {
        if (!dbMessage) return [];

        const pinnedMessages = await pinnedEmbedSchema.find({
            message: dbMessage._id
        });
        
        return pinnedMessages;
    }

    async getKarmaTotalString(message, messageDocument) {
        if (!message.guild) return;

        // If the message doc. or karma total don't exist, then the karma should be equal to 0
        const karmaTotal = messageDocument?.karma ? messageDocument.karma : "0"
        const guildKarmaData = await Personalisation.getGuildKarmaData(message.guild)
        return guildKarmaData?.emoji + ' **' + karmaTotal + '**'
    }

    async setEmbedAuthor(message) {
        if (!message.author) return;
        const avatarURL = message.author.avatarURL()
        return {
            name: message.author.username,
            icon_url: avatarURL ? avatarURL : undefined
        }
    }

    async setEmbedReply(message) {
        if (!message.reference || !message.reference.messageId) return;
        const reply = await message.channel.messages.fetch(message.reference.messageId);
        return {
            name: 'Replying to ' + reply.author.username,
            value: reply.content,
        }
    }

    async setEmbedSingleImage(message) {
        if (!message.attachments) return;
        if (message.attachments.size > 1) return;

        for (const attachment of message.attachments.values()) {
            if (attachment.url) {
                return {
                    url: attachment.url
                };
            }
        }
    }

    async setEmbedImages(message, url) {
        let embedArray = []

        // Attachments
        if (message.attachments.values() && message.attachments.size > 1) {
            for (const attachment of message.attachments.values()) {
                if (attachment.url) {
                    embedArray.push({
                        url: url,
                        image: {
                            url: attachment.url
                        }
                    });
                }
            }
        }
        
        // Embeds
        if (message.embeds.length > 0) {
            for (const embed of message.embeds) {
                let imageUrl = false;
                
                if (embed.image && embed.image.url) imageUrl = embed.image.url;
                if (embed.thumbnail && embed.thumbnail.url) imageUrl = embed.thumbnail.url;

                if (imageUrl) {
                    embedArray.push({
                        url: url,
                        image: {
                            url: imageUrl,
                        }
                    });
                }
            }
        }

        return embedArray;
    }

    async setEmbedFooter(message) {
        const embedFooter = await this.generateEmbedFooter(message);
        const includesMessage = await this.generateIncludesString(message);

        // Array of every possible footer element
        let text = [embedFooter?.text, includesMessage]

        // Remove any nulls or undefineds
        text = text.filter(function( text ) {
            return text !== undefined && text !== null;
        });

        // Separate elements
        let separatedText = text[0]
        if (text.length >= 1) separatedText = text.join(' | ');

        return {
            text: separatedText ? separatedText : '',
            iconURL: embedFooter?.iconURL ? embedFooter.iconURL : null
        }
    }

    async setEmbedColor(message) {
        return message.embeds[0]?.color ? message.embeds[0]?.color : 0x202225
    }

    async generateEmbedFooter(message) {
        if (message.embeds.length == 0) return;
        const embed = message.embeds[0]
        if (!embed.footer) return;

        return {
            text: embed.footer.text ? embed.footer.text : null,
            iconURL: embed.footer.iconURL ? embed.footer.iconURL : null,
        }
    }

    async generateIncludesString(message) {
        if (!message.attachments) return;
        const [firstAttachment] = message.attachments.values();
        if (!firstAttachment) return;

        let includesMessage = '';
        let contentType = null;

        // Determine the type of attachment
        if (firstAttachment.contentType) {
            contentType = firstAttachment.contentType.split('/')[0];

            if (contentType && contentType == 'video')      includesMessage = 'a video'
            else if (contentType && contentType == 'audio') includesMessage = 'an audio'
            else if (contentType != 'image')                includesMessage = 'an attachment'
        } else {
            includesMessage = 'an attachment' // Certain files don't show a contentType at all.
        }

        // Determine if there's more than one attachment / embed
        if (message.attachments.size >= 5 && !includesMessage) {
            includesMessage = 'more than one attachment'
        } else if (message.embeds.length >= 2) {
            includesMessage = 'more than one embed'
        }

        if (!includesMessage) return;
        return 'This message includes ' + includesMessage + '.'
    }
    
    async parseEmbedIntoFields(message) {
        let fields = []

        for (const embed of message.embeds) {
            const name = embed.title ? embed.title : embed.author?.name;
            if (!name) continue;

            fields.push({
                name: name ? name : '',
                value: embed.description ? embed.description : ''
            })

            for (const embedFields of embed.fields) {
                fields.push({
                    name: embedFields.name,
                    value: embedFields.value,
                    inline: embedFields.inline
                })                
            }
        }

        return fields;
    }
}

module.exports = new Pin();