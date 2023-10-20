const reactablePacks = require('./reactablePacks');

module.exports = [
    {
        name: 'plus',
        emojiUrl: reactablePacks.reto.images.plus,
        emojiIds: ['👍', '❤️', '⬆️'],
        karmaAwarded: 1
    },
    {
        name: 'minus',
        emojiUrl: reactablePacks.reto.images.minus,
        emojiIds: ['👎', '💔', '⬇️'],
        karmaAwarded: -1
    },
    {
        name: 'pin',
        emojiUrl: reactablePacks.reto.images.pin,
        emojiIds: ['📌', '⭐'],
        karmaAwarded: 0,
        isBestOf: true,
        sendsToChannel: '',
        lockedBehindRoles: [],
    }
]