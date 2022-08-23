import { Message, PartialMessage, Client, TextChannel, MessageEmbed, User } from "discord.js";
import WOKCommands from 'wokcommands';

export default class Pin {
    static async pinMessageToChannel(message: Message | PartialMessage, reactable: any, client: Client) {
        // Message Content (embeds, attachments, components...) are
        // Privileged Intents now, and may not show up on unverified bots.
        if (!message || !message.content) return;

        const embed = await this.generateMessageEmbed(message)

        client.channels.fetch(reactable.sendsToChannel).then((channel) => {
            if (!channel) return;
            (channel as TextChannel).send({ embeds: [embed] })
        });
    }

    static async generateMessageEmbed(message: Message | PartialMessage) {

        interface MessageEmbed {
            color: number,
            description: string | undefined,
            timestamp: string,
            footer: {
                text: string
            },
            author?: {
                name: string,
                icon_url: string | undefined
            },
            fields?: any,
            image?: {
                url: string
            }
        }

        // Generate default message embed
        let messageEmbed : MessageEmbed = {
            color: 0x0099FF,
            description: message.content ? message.content : undefined,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Test footer'
            }
        };

        // OPTIONAL: Add author
        if (message.author) {
            const avatarURL = message.author.avatarURL()
            messageEmbed.author = {
                name: message.author.username,
                icon_url: avatarURL ? avatarURL : undefined
            }
        }

        // OPTIONAL: Add reply
        if (message.reference?.messageId) {
            const reply = await message.channel.messages.fetch(message.reference.messageId);
            messageEmbed.fields = [{
                name: 'Replying to ' + reply.author.username,
                value: reply.content
            }]
        }

        // OPTIONAL: Add attachments
        const [firstAttachment] = message.attachments.values();
        if (firstAttachment) {
            messageEmbed.image = {
                url: firstAttachment.url
            }
        }
        
        return messageEmbed;
    }
}