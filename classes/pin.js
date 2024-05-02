const { ActionRowBuilder, ButtonBuilder } = require('discord.js');

// Schemas
const messageSchema = require('../schemas/message');
const pinnedEmbedSchema = require('../schemas/pinnedEmbed');
const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const pinThresholdSchema = require('../schemas/pinThreshold');

// Classes
const ReactionCheck = require("./reactionCheck")
const Personalisation = require("./personalisation");

// Data
const retoEmojis = require('../data/retoEmojis');

class Pin {
    
    constructor() {
        if (Pin._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Pin._instance = this;
    }

    async pinMessageToChannel(message, reactable, client, isPositive, user = false, isChainUpdate = false) {
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
        const reactionCount = await this.getReactionCount(reactable, message);
        const pinThresholds = await pinThresholdSchema.find({
            guildId: message.guildId
        }).exec();
        const matchingThreshold = await this.getMatchingPinThreshold(pinThresholds, message, messageDocument, true);

        const iterableChannels = await this.getIterableChannels(message, messageDocument, reactable, reactionCount, pinThresholds, isPositive, isChainUpdate);
        if (!iterableChannels) return;

        for (const iterableChannel of iterableChannels) {
            // Delete embeds, if the Reactable's Reaction Threshold is not met
            // or if the Pin Threshold is lesser or greater than the current Karma amount
            if (reactable.sendsToChannel) {
                console.log(reactable.reactionThreshold);
                console.log(reactionCount);
            }
            if (!isPositive &&
                (reactable.sendsToChannel && reactable.reactionThreshold < reactionCount ||
                matchingThreshold)) {
                this.deletePinnedEmbed(iterableChannel, client);
                continue;
            }

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
                        try {
                            pinnedMessage.edit({ content: karmaString, embeds: embed, components: [row] })
                        } catch (e) {
                            console.log("❌ Couldn't edit pinned message! ".red + "(ID: ".gray + iterableChannel.embed.gray + ")".gray)
                        }
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
        //const reactionCount = await this.getReactionCount(reactable, message);
        const iterableChannels = await this.getIterableChannels(message, databaseMessage, false, false, false, false, false);
        if (!iterableChannels) return;

        for (const iterableChannel of iterableChannels) {
            this.deletePinnedEmbed(iterableChannel, client);
        }

    }

    async getIterableChannels(message, dbMessage, reactable, reactionCount, pinThresholds, isPositive, isChainUpdate = false) {
        const pinnedMessages = await this.getAttachedPinnedMessages(dbMessage);
        let matchingThreshold = null; 
        if (pinThresholds) matchingThreshold = await this.getMatchingPinThreshold(pinThresholds, message, dbMessage);

        let iterableChannels = [];

        // Update pinned messages
        if (pinnedMessages.length > 0) {
            for (const pinnedMessage of pinnedMessages) {
                if (reactionCount >= reactable.reactionThreshold || !isPositive || isChainUpdate) {
                    iterableChannels.push({
                        id: pinnedMessage.channelId,
                        embed: pinnedMessage.pinnedEmbedId,
                        edit: true
                    });
                }
            }
        }
        
        // Create new message [if this is a Channel-sending Reactable]
        else if (reactable.sendsToChannel && reactionCount >= reactable.reactionThreshold) {
            iterableChannels.push({
                id: reactable.sendsToChannel,
                embed: "",
                edit: false
            });
        }

        // Create new message [if a Pin Threshold is passed]
        else if (matchingThreshold) {
            iterableChannels.push({
                id: matchingThreshold.channelId,
                embed: "",
                edit: false
            });
        }

        return iterableChannels;
    }
    
    async deletePinnedEmbed(iterableChannel, client) {
        client.channels.fetch(iterableChannel.id).then(channel => {
            try {
                channel.messages.delete(iterableChannel.embed);
            } catch (e) {
                console.log("❌ Couldn't delete pinned message! ".red + "(ID: ".gray + iterableChannel.embed.gray + ")".gray)
            }

            pinnedEmbedSchema.deleteMany({
                pinnedEmbedId: iterableChannel.embed
            }).exec();
        });
    }
    async generateMessageEmbed(message, replyPreview = false) {
        // Generate default message embed
        let messageEmbed = {
            url: "https://retobot.com", // Necessary for multiple image support
            description: "** **",
            timestamp: new Date().toISOString(),
            fields: []
        };

        // Optional fields
        messageEmbed.footer = await this.setEmbedFooter(message);
        messageEmbed.color  = await this.setEmbedColor(message);
        messageEmbed.image  = await this.setEmbedSingleImage(message);

        // Embed replies, authors, et cetera
        const chain = await this.getMessageChain(message, replyPreview);
        const chainFields = await this.setEmbedMessages(message, chain);
        messageEmbed.author = await this.setEmbedAuthor(message, chainFields);
        
        if (chainFields.length > 0) {
            messageEmbed.fields = chainFields;
        } else {
            messageEmbed.description = message.content;
        }

        
        const portedFields = await this.parseEmbedIntoFields(message);
        if (portedFields.length > 0) messageEmbed.fields = messageEmbed.fields.concat(portedFields);
        
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

    async setEmbedAuthor(message, chain) {
        if (!message.author) return;
        const avatarURL = message.author.avatarURL()
        const authors = await this.getAllAuthors(message, chain);
        
        switch (authors.length) {
            case 1:
                return {
                    name: message.author.username,
                    icon_url: avatarURL ? avatarURL : undefined
                }
            case 2:
                return {
                    name: message.author.username + " and " + authors[1],
                    icon_url: avatarURL ? avatarURL : undefined
                }
            default:
                const extraAuthors = authors.length - 1
                const others = extraAuthors == 1 ? "other" : "others";
                return {
                    name: message.author.username + " (and " + extraAuthors + others + ")",
                    icon_url: avatarURL ? avatarURL : undefined
                }
        }
    }

    async getAllAuthors (message, chain) {
        let authorList = [message.author.username];
        if (!chain) return authorList;

        for (const chainMessage of chain) {
            if (!authorList.includes(chainMessage.name)) {
                authorList.push(chainMessage.name);
            }
        }

        return authorList;
    }

    async getDirectReply (message) {
        if (!message.reference || !message.reference.messageId) return;
        const reply = await message.channel.messages.fetch(message.reference.messageId); 

        return {
            document: null,
            message: reply
        };
    }

    async setEmbedMessages (baseMessage, chain) {
        let messageList = [];
        let previousElement;

        if (!chain) return messageList;
        for (const [i, chainElement] of chain.entries()) {
            previousElement = messageList[messageList.length - 1];

            const includes = await this.generateIncludesString(chainElement.message, true, false);
            const content = includes ? chainElement.message.content + "\n_" + retoEmojis.dottedLineEmoji +  " " + includes + "_": chainElement.message.content;
            
            if (previousElement && previousElement.name == chainElement.message.author.username) {
                // Copy same content to previous element
                previousElement.value += "\n" + content;
            } else {
                // Create a new element
                messageList.push({
                    name: chainElement.message.author.username,
                    value: content,
                })
            }
        };

        // TO-DO: This code structure is repeated.
        // Fix this up, eventually.
        if (previousElement && previousElement.name == baseMessage.author.username) {
            // Copy same content to previous element
            previousElement.value += "\n" + baseMessage.content;
        } else {
            // Create a new element
            messageList.push({
                name: baseMessage.author.username,
                value: baseMessage.content,
            })
        }

        return messageList;
    }

    async getMessageChain (message, previewMessage = false) {
        let messageChain = [];

        // Add messages from the stored Chain
        if (message) messageChain = await this.getStoredMessageChain(message);

        // Add messages from the preview
        if (previewMessage) messageChain.push(await this.getPreviewChain(previewMessage));

        // Add messages from direct replies
        if (message.reference) messageChain.push(await this.getDirectReply(message));

        return await this.orderMessageChain(messageChain);
    }

    async orderMessageChain (messageChain) {
        return messageChain.sort((a, b) => (a.message.createdTimestamp > b.message.createdTimestamp ? 1 : -1));
    }

    async getStoredMessageChain (message) {
        let messageChain = [];

        const messageDocument = await messageSchema.aggregate([
            { $match: { "messageId": message.id } },
            { $limit: 1 },
            {
                $lookup: {
                    from: "messages",
                    localField: "chain",
                    foreignField: "_id",
                    as: "chainMessages"
                }
            }
        ]).exec();
        
        if (!messageDocument.length) return [];
        
        for (let chainDocument of messageDocument[0].chainMessages) {
            const chainMessage = await message.channel.messages.fetch(chainDocument.messageId);
            if (!chainMessage) continue;

            messageChain.push({
                document: chainDocument,
                message: chainMessage
            });
        }

        return messageChain;
    }

    async getPreviewChain (previewMessage) {
        const previewDocument = await messageSchema.findOneAndUpdate(
            { messageId: previewMessage.id },
            {
                $set: { 'userId': previewMessage.id, 'guildId': previewMessage.guildId, 'channelId': previewMessage.channel.id }
            },
            { upsert: true }
        ).exec();
        
        return {
            document: previewDocument,
            message: previewMessage
        };
    }

    async setEmbedSingleImage(message) {
        if (!message.attachments && !message.embeds) return;
        
        // Image based on an attachment
        if (message.attachments.size == 1 && !message.embeds.length) {
            for (const attachment of message.attachments.values()) {
                if (attachment.url) {
                    return {
                        url: attachment.url
                    };
                }
            }
        }

        // Image based on an embed
        else if (message.embeds.length == 1 && !message.attachments.size) {
            const embed = message.embeds[0];
            let imageUrl = false;
            
            if (embed.image && embed.image.url) imageUrl = embed.image.url;
            if (embed.thumbnail && embed.thumbnail.url) imageUrl = embed.thumbnail.url;

            if (imageUrl) {
                return {
                    url: imageUrl
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
        if (message.embeds.length > 1) {
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

    async generateIncludesString(message, imageAllowed = false, verbose = true) {
        if (!message.attachments) return;
        const [firstAttachment] = message.attachments.values();
        if (!firstAttachment) return;

        let includesMessage = '';
        let contentType = null;

        // Determine the type of attachment
        if (firstAttachment.contentType) {
            contentType = firstAttachment.contentType.split('/')[0];

            if (contentType && contentType == 'video')                       includesMessage = 'a video'
            else if (contentType && contentType == 'audio')                  includesMessage = 'an audio'
            else if (contentType && contentType == 'image' && imageAllowed)  includesMessage = 'an image'
            else if (contentType != 'image')                                 includesMessage = 'an attachment'
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
        return verbose ? 'This message includes ' + includesMessage + '.' : 'Includes ' + includesMessage
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

    async getReactionCount (reactable, message) {
        // Add to list if message has enough reactions
        let reactionCount = 0;

        if (reactable) {
            for (const emojiId of reactable.emojiIds) {
                // TO-DO: What happens if it's not in cache?!
                const reaction = message.reactions.cache.get(emojiId)
                if (!reaction) continue;
                reactionCount += reaction.count;
            }
        }

        return reactionCount;
    }

    async getMatchingPinThreshold (pinThresholds, message, dbMessage, isLesserOrGreater = false) {
        if (!dbMessage) return;

        let matchingThreshold = null;
        if (!isLesserOrGreater) matchingThreshold = pinThresholds.find(threshold => threshold.karma === dbMessage.karma);

        else {
            // Used to determine if a message has more or less Karma than the Pin Threshold.
            // This is important because the amount of Karma in a Threshold can be positive or negative!
            matchingThreshold = pinThresholds.find(threshold => {
                if (dbMessage.karma > 0 && dbMessage.karma < threshold.karma) {
                    return true;
                } else if (dbMessage.karma < 0 && dbMessage.karma > threshold.karma) {
                    return true;
                }
                
                return false;
            });
        }

        return matchingThreshold;
    }

    async deletePinThreshold (channel) {
		await pinThresholdSchema.deleteMany(
			{
				channelId: channel.id,
				guildId: channel.guild.id
			},
		).exec();
    }
}

module.exports = new Pin();