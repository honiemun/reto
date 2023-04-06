module.exports = [
    {
        name: 'plus',
        emojiUrl: 'https://cdn.discordapp.com/attachments/591468984528797697/1010940218108543087/plus.png',
        emojiIds: ['👍', '❤️', '⬆️'],
        karmaAwarded: 1,
        messageConfirmation: 'You have been awarded 1 karma!',
    },
    {
        name: 'minus',
        emojiUrl: 'https://cdn.discordapp.com/attachments/591468984528797697/1010940217588453397/minus.png',
        emojiIds: ['👎', '💔', '⬇️'],
        karmaAwarded: -1,
        messageConfirmation: 'You have been awarded -1 karma!',
    },
    {
        name: 'pin',
        emojiUrl: 'https://cdn.discordapp.com/attachments/591468984528797697/1010940217055789066/star.png',
        emojiIds: ['📌', '⭐'],
        karmaAwarded: 0,
        messageConfirmation: 'Banger tweet, bestie!',
        isBestOf: true,
        sendsToChannel: '',
        lockedBehindRoles: [],
    }
]