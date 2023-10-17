class Parsing {

    constructor() {
        if (Parsing._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Parsing._instance = this;
    }

    async emoji(emoji, guild) {
        // This function returns a Discord emoji ready for use in messages, or a default Emoji.
        if (/<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu.test(emoji)) return emoji;
        
        const discordEmoji = guild.emojis.cache.find(emojiObj => emojiObj.id === emoji);
        return discordEmoji ? "<:" + discordEmoji.name + ":" + discordEmoji.id + ">" : "❔";
    }
}

module.exports = new Parsing();