import { Message, PartialMessage, Client, TextChannel, MessageEmbed, User, MessageActionRow, MessageButton } from "discord.js";
import WOKCommands from 'wokcommands';

import Personalisation from '../classes/personalisation';
import Embed from '../interfaces/messageEmbed';

// Schemas
import messageSchema from '../schemas/message';
import pinnedEmbedSchema from '../schemas/pinnedEmbed';

export default class Pin {
    static async pinMessageToChannel(message: Message | PartialMessage, reactable: any, client: Client) {
        if (!message) return;

        const embed          = await this.generateMessageEmbed(message);
        const karma          = await this.getKarmaTotalString(message);
        const pinnedMessages = await this.getAttachedPinnedMessages(message, client);
        
        // Get the channel to send/edit the message into
        interface IterableChannels {
            id: string,
            embed: string,
            edit: boolean
        }

        let iterableChannels: Array<IterableChannels> = [];

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

        for (const iterableChannel of iterableChannels) {
            client.channels.fetch(iterableChannel.id).then((channel) => {
    
                // Attach a Jump to message button
                const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setLabel('Jump to message')
                        .setStyle("LINK")
                        .setURL(message.url)
                );
                
                // Send or edit message.
                // TO-DO: SPLIT INTO ANOTHER FUNCTION !!
                if (!iterableChannel.edit) {
                    (channel as TextChannel).send({ content: karma, embeds: [embed], components: [row] }).then((sentEmbed: any) => {
                        this.storePinnedEmbed(sentEmbed, message);
                    })
                } else {
                    (channel as TextChannel).messages.fetch(iterableChannel.embed).then((pinnedMessage: any) => {
                        pinnedMessage.edit({ content: karma, embeds: [embed], components: [row] })
                    })
                }
            });
        }
    }

    static async generateMessageEmbed (message: Message | PartialMessage) {


        // Generate default message embed
        let messageEmbed : Embed = {
            description: message.content ? message.content : undefined,
            timestamp: new Date().toISOString(),
            fields: []
        };

        // Optional fields
        messageEmbed.author = await this.setEmbedAuthor(message);
        messageEmbed.image  = await this.setEmbedImage(message);
        messageEmbed.footer = await this.setEmbedFooter(message);
        messageEmbed.color  = await this.setEmbedColor(message);

        messageEmbed.fields = await this.parseEmbedIntoFields(message);
        const embedReply = await this.setEmbedReply(message); // I pray to the Typescript gods above to forgive me for such ingenuity
        if (message.reference && embedReply) messageEmbed.fields.push(embedReply);
        
        return messageEmbed;
    }

    static async storePinnedEmbed (sentEmbed: Message | PartialMessage, message: Message | PartialMessage) {
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

    }

    // Fetches the message attached to a pinnedEmbed object on the database.
    // TO-DO: Necessary??
    static async getStoredPinnedMessage (message: Message | PartialMessage, client: Client) {
        const pinnedEmbed = await pinnedEmbedSchema.findOne({
            pinnedEmbedId: message.id
        }).populate("message").exec();
        
        // This is disgusting. You know what else is disgusting?
        // Message is a promise (prototype?!) and for the life of me I can't resolve it.
        // Populate deserves a special place in hell for this, and so do I
        if (!pinnedEmbed) return null;
        return JSON.parse(JSON.stringify(pinnedEmbed.message));
    }

    // Fetches the array of pinnedEmbeds attached to a message object.
    static async getAttachedPinnedMessages (message: Message | PartialMessage, client: Client) {
        const storedMessage = await messageSchema.findOne({
            messageId: message.id
        }).populate("pinnedEmbeds").exec();
        
        if (!storedMessage) return [];
        return JSON.parse(JSON.stringify(storedMessage.pinnedEmbeds));
    }

    static async getKarmaTotalString (message: Message | PartialMessage) {
        if (!message.guild) return;
        
        const messageDocument = await messageSchema.findOne({
            messageId: message.id
        }).exec();

        // If the message doc. or karma total don't exist, then the karma should be equal to 0
        const karmaTotal = messageDocument?.karma ? messageDocument.karma : "0"
        const guildKarmaData = await Personalisation.getGuildKarmaData(message.guild)
        return guildKarmaData?.emoji + ' **' + karmaTotal + '**'
    }

    static async setEmbedAuthor (message: Message | PartialMessage) {
        if (!message.author) return;
        const avatarURL = message.author.avatarURL()
        return {
            name: message.author!.username,
            icon_url: avatarURL ? avatarURL : undefined
        }
    }

    static async setEmbedReply (message: Message | PartialMessage) {
        if (!message.reference || !message.reference.messageId) return;
        console.log("Maybe this part")
        const reply = await message.channel.messages.fetch(message.reference.messageId);
        console.log("Maybe this part")
        return {
            name: 'Replying to ' + reply.author.username,
            value: reply.content,
        }
    }

    static async setEmbedImage (message: Message | PartialMessage) {
        if (message.attachments.size == 0 && message.embeds.length == 0) return;
        const [firstAttachment] = message.attachments.values();
        
        let imageUrl = '';
        if (firstAttachment) imageUrl = firstAttachment.url;
        else if (message.embeds[0].image) imageUrl = message.embeds[0].image.url

        return {
            url: imageUrl
        }
    }

    static async setEmbedFooter (message: Message | PartialMessage) {
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

    static async setEmbedColor (message: Message | PartialMessage) {
        return message.embeds[0]?.color ? message.embeds[0]?.color : 0x202225
    }

    static async generateEmbedFooter (message: Message | PartialMessage) {
        if (message.embeds.length == 0) return;
        const embed = message.embeds[0]
        if (!embed.footer) return;

        return {
            text: embed.footer.text ? embed.footer.text : null,
            iconURL: embed.footer.iconURL ? embed.footer.iconURL : null,
        }
    }

    static async generateIncludesString (message: Message | PartialMessage) {
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
        if (message.attachments.size >= 2 && !includesMessage) {
            includesMessage = 'more than one attachment'
        } else if (message.embeds.length >= 2) {
            includesMessage = 'more than one embed'
        }

        if (!includesMessage) return;
        return 'This message includes ' + includesMessage + '.'
    }
    
    static async parseEmbedIntoFields (message: Message | PartialMessage) {
        let fields: Embed["fields"] = []

        for (const embed of message.embeds) {
            const name = embed.title ? embed.title : embed.author?.name;

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