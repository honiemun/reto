import { CommandInteraction, Message } from 'discord.js';

export default class I18n {

    static async translate (translationKey: string, instance: any, message?: Message, interaction?: CommandInteraction) {
        if ((!message && !interaction)) return translationKey;
        
        const guild = message ? message.guild : interaction?.guild;
        return instance.messageHandler.get(guild, translationKey);
    }
}