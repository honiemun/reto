// Schemas
const autoreactSchema = require('../../schemas/autoreact');

module.exports = async (message, instance) => {
    let rules = await autoreactSchema.aggregate([
        { $match:
            { channelId: message.channel.id }
        },
        { $lookup:
            {
                from: "reactables",
                localField: "reactableId",
                foreignField: "_id",
                as: "reactables"
            }
        }
    ]);

    if (!rules) return;


    // Filter whether to react depending on the content type
    let messageTypes = [];
    if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
            if (attachment.contentType.includes("image") || attachment.contentType.includes("video") || attachment.contentType.includes("audio")) {
                messageTypes.push("media");
            } else {
                messageTypes.push("file");
            }
        }
    }

    if (message.embeds.length > 0) {
        messageTypes.push("embed");
    }

    if (message.content.length > 0 && messageTypes.length == 0) {
        // Text is used as a "last resort" and only includes text-only messages.
        messageTypes.push("text");
    };

    console.log(messageTypes);

    for (const rule of rules) {
        if (!rule.contentTypes.some(value => messageTypes.includes(value))) continue;

        // React with the primary emoji
        const reactable = rule.reactables[0];
        let emoji = message.guild.emojis.cache.find(emoji => emoji.id === reactable.emojiIds[0]);
        if (!emoji) emoji = reactable.emojiIds[0]; // TO-DO: Error-checking. Automatically assumes if emoji isn't Discord-made, it's a default one.

        message.react(emoji);
    }
};