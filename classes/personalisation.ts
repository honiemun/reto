import { Guild, Message, PartialMessage } from "discord.js";
import { retoEmojis } from '../data/retoEmojis';

// Schemas
import guildSchema from '../schemas/guild';

export default class Pin {
    static async getGuildKarmaData(guild: Guild) {
        const guildDocument = await guildSchema.findOne({
            guildId: guild.id
        }).exec();
        if (!guildDocument) return;

        return {
            name: guildDocument.karmaName ? guildDocument.karmaName : guild.name + ' Karma',
            // TO-DO: Can't fetch karma emoji correctly because God has
            // cursed me for my hubris, and my work is never finished
            emoji: guildDocument.karmaEmoji ? guildDocument.karmaEmoji : retoEmojis.karmaEmoji
        }
    }
}