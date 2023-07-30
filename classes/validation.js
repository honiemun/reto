const Embed = require("../classes/embed");

class Validation {

    constructor() {
        if (Validation._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Validation._instance = this;
    }
    

    async validateEmoji(emoji) {
        // Check if the emoji is valid
        const isEmoji = (str) => str.match(/((?<!\\)<:[^:]+:(\d+)>)|\p{Emoji_Presentation}|\p{Extended_Pictographic}/gmu);

        if (!isEmoji(emoji)) {
            return Embed.createErrorEmbed("`" + emoji + "` is not an emoji!");
        }

        if (isEmoji(emoji).length > 1) {
            return Embed.createErrorEmbed("You can only set one emoji at a time!");
        }
    }
}

module.exports = new Validation();