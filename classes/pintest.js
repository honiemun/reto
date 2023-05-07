// Schemas
const messageSchema = require('../schemas/message');
const pinnedEmbedSchema = require('../schemas/pinnedEmbed');
const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');

// Classes
const Reaction = require("./reaction")

module.exports = {
    pinMessageToChannel: async function (message, reactable, client, user = false) {
        if (!message) return;

        // Check if previously reacted
        if (user) {
            const hasReacted = await Reaction.checkIfPreviouslyReacted(message, user, reactable);
            if (!hasReacted) {
                // TO-DO: Remove this user's pinned post if this is the last star.
                // Would require checking for the reactions of the post
                return;
            }
        }

        const embed          = await this.generateMessageEmbed(message);
        const karmaString    = await this.getKarmaTotalString(message);
        
        // Get the channel to send/edit the message into
        const iterableChannels = await this.getIterableChannels(message, reactable);
        if (!iterableChannels) return;

        for (const iterableChannel of iterableChannels) {
            client.channels.fetch(iterableChannel.id).then((channel) => {
    
                // Attach a Jump to message button
                const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Jump to message')
                        .setStyle("LINK")
                        .setURL(message.url)
                );
                
                // Send or edit message.
                // TO-DO: SPLIT INTO ANOTHER FUNCTION !!
                if (!iterableChannel.edit) {
                    channel.send({ content: karmaString, embeds: embed, components: [row] }).then((sentEmbed) => {
                        this.storePinnedEmbed(sentEmbed, message);
                    })
                } else {
                    channel.messages.fetch(iterableChannel.embed).then((pinnedMessage) => {
                        pinnedMessage.edit({ content: karmaString, embeds: embed, components: [row] })
                    })
                }
            });
        }
    },

    deleteMessage: async function (message, client) {
        // Remove the user's karma from that message
        const databaseMessage = await messageSchema.findOne({ messageId: message.id }).exec();
        if (!databaseMessage) return; // Ignore all messages not on the DB.
        
        if (databaseMessage.karma != 0) {
            await userSchema.findOneAndUpdate(
                { userId: message.author.id },
                { $inc : { 'globalKarma' : -databaseMessage.karma } },
                { upsert: true }
            ).exec();
    
            await memberSchema.findOneAndUpdate(
                { userId: message.author.id, guildId: message.guildId },
                { $inc : { 'karma' : -databaseMessage.karma } },
                { upsert: true }
            ).exec();
        }


        // Delete all pinned messages (database and Discord)
        const iterableChannels = await this.getIterableChannels(message, false);
        if (!iterableChannels) return;

        for (const iterableChannel of iterableChannels) {
            client.channels.fetch(iterableChannel.id).then(channel => {
                channel.messages.delete(iterableChannel.embed);

                pinnedEmbedSchema.findOneAndRemove({
                    pinnedEmbedId: message.id
                }).exec();
            });
        }

        // Delete the message from the database
        await messageSchema.findOneAndRemove(
            { messageId: message.id }
        ).exec();
    },

    getIterableChannels: async function (message, reactable) {
        const pinnedMessages = await this.getAttachedPinnedMessages(message);
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
    },
    
    generateMessageEmbed: async function (message) {
        
        // Generate default message embed
        let messageEmbed = {
            url: "https://github.com/honiemun/reto", // Necessary for multiple image support
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
        
        let embedArray = await this.setEmbedImages(message, "https://github.com/honiemun/reto");
        embedArray.unshift(messageEmbed)

        return embedArray;
    },

    storePinnedEmbed: async function (sentEmbed, message) {
        // TO-DO: Probably can be refactored to remove the first part (saving message in pinnedEmbedSchema) entirely.
        // Unfortunately, I'm too tired. Skill Issue.
        messageSchema.findOne({ messageId: message.id }).exec().then((storedMessage) => {
            if (!storedMessage) return;

            new pinnedEmbedSchema({
                pinnedEmbedId: sentEmbed.id,
                channelId: sentEmbed.channel.id,
                message: storedMessage._id
            }).save().then((pinnedEmbed) => {
                messageSchema.findOneAndUpdate(
                    { messageId: message.id },
                    { $push: { 'pinnedEmbeds': pinnedEmbed._id } },
                    { upsert: true, new: true }
                ).exec();
            });
        })

    },

    // Fetches the message attached to a pinnedEmbed object on the database.
    // TO-DO: Necessary??
    getStoredPinnedMessage: async function (message) {
        const pinnedEmbed = await pinnedEmbedSchema.findOne({
            pinnedEmbedId: message.id
        }).populate("message").exec();
        
        // This is disgusting. You know what else is disgusting?
        // Message is a promise (prototype?!) and for the life of me I can't resolve it.
        // Populate deserves a special place in hell for this, and so do I
        if (!pinnedEmbed) return null;
        return JSON.parse(JSON.stringify(pinnedEmbed.message));
    },

    // Fetches the array of pinnedEmbeds attached to a message object.
    getAttachedPinnedMessages: async function (message) {
        const storedMessage = await messageSchema.findOne({
            messageId: message.id
        }).populate("pinnedEmbeds").exec();
        
        if (!storedMessage) return [];
        return JSON.parse(JSON.stringify(storedMessage.pinnedEmbeds));
    },

    getKarmaTotalString: async function (message) {
        if (!message.guild) return;
        
        const messageDocument = await messageSchema.findOne({
            messageId: message.id
        }).exec();

        // If the message doc. or karma total don't exist, then the karma should be equal to 0
        const karmaTotal = messageDocument?.karma ? messageDocument.karma : "0"
        const guildKarmaData = await Personalisation.getGuildKarmaData(message.guild)
        return guildKarmaData?.emoji + ' **' + karmaTotal + '**'
    },

    setEmbedAuthor: async function (message) {
        if (!message.author) return;
        const avatarURL = message.author.avatarURL()
        return {
            name: message.author.username,
            icon_url: avatarURL ? avatarURL : undefined
        }
    },

    setEmbedReply: async function (message) {
        if (!message.reference || !message.reference.messageId) return;
        const reply = await message.channel.messages.fetch(message.reference.messageId);
        return {
            name: 'Replying to ' + reply.author.username,
            value: reply.content,
        }
    },

    setEmbedSingleImage: async function (message) {
        if (!message.attachments) return;
        if (message.attachments.size > 1) return;

        for (const attachment of message.attachments.values()) {
            if (attachment.url) {
                return {
                    url: attachment.url
                };
            }
        }
    },

    setEmbedImages: async function (message, url) {
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
                console.log(embed);
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
    },

    setEmbedFooter: async function (message) {
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
    },

    setEmbedColor: async function (message) {
        return message.embeds[0]?.color ? message.embeds[0]?.color : 0x202225
    },

    generateEmbedFooter: async function (message) {
        if (message.embeds.length == 0) return;
        const embed = message.embeds[0]
        if (!embed.footer) return;

        return {
            text: embed.footer.text ? embed.footer.text : null,
            iconURL: embed.footer.iconURL ? embed.footer.iconURL : null,
        }
    },

    generateIncludesString: async function (message) {
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
    },
    
    parseEmbedIntoFields: async function (message) {
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