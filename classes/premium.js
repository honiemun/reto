const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

class Premium {
    
    constructor() {
        if (Premium._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Premium._instance = this;
    }

    async sendGuildPremiumMessage(guildDocument) {
        const premium = await this.checkGuildPremium(guildDocument);
        if (premium) return;

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🌟 This command is exclusive to Reto Gold.')
            .setDescription(
`**Go beyond. Go Gold.**
With Reto Gold, you can access premium features to make Reto your own.

- **Create your own Reactables**
Need to go beyond the basic _Plus_, _Minus_ and _Pinning_ functionality?
Arts and crafts channel? A Wall of Shame? Moderation waiting log?
Create your very own custom emoji for whatever your commmunity needs.

- **Customize Everything**
Send messages to pinned channels after a certain number of reactions,
edit your users' Server Karma, and unlock the whole suite of personalization commands.

- **First-in-line Access**
Use Reto's upcoming new commands early with *Reto Feature Drops*.
New features every month through the end of 2025 - brand new ones you can use
before anyone else, and side-features that'll remain exclusive to Gold members.`);
        
        const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Get Reto Gold')
                .setStyle("Link")
                .setURL("https://retobot.com/gold")
        );

        return {
            embeds: [embed],
            components: [row]
        }
    }

    async checkGuildPremium(guildDocument) {
        // Premium features are always unlocked when in development
        if (JSON.parse(process.env.DEBUG_PREMIUM)) return true;

        if (guildDocument.premiumTime >= Date.now()) return true;
        return false;
    }
    
    async checkUserPremium(userDocument) {
        if (userDocument.premiumTime >= Date.now()) return true;
        return false;
    }

}

module.exports = new Premium();