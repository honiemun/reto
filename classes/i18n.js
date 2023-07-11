const { CommandInteraction, Message } = require('discord.js');

class I18n {

    constructor() {
        if (I18n._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        I18n._instance = this;
    }
    
    async translate (translationKey, instance, message = null, interaction = null) {
        if ((!message && !interaction)) return translationKey;
        
        const guild = message ? message.guild : interaction?.guild;
        // instance.messageHandler.get(guild, translationKey);
        // TO-DO: REIMPLEMENT
        return translationKey;
    }
}

module.exports = new I18n();