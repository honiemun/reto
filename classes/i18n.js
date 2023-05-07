const { CommandInteraction, Message } = require('discord.js');

module.exports = class I18n {

    static async translate (translationKey, instance, message = null, interaction = null) {
        if ((!message && !interaction)) return translationKey;
        
        const guild = message ? message.guild : interaction?.guild;
        // instance.messageHandler.get(guild, translationKey);
        // TO-DO: REIMPLEMENT
        return translationKey;
    }
}