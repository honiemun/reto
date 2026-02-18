const retoEmojis = require('./retoEmojis.js');

module.exports = {
    "reto": {
        "images": {
            "plus": './assets/reactables/plus.png',
            "minus": './assets/reactables/minus.png',
            "pin": './assets/reactables/pin.png'
        },
        "emoji": retoEmojis.reactables.reto
    },
    "reddit": {
        "images": {
            "plus": './assets/reactables/reddit/plus.png',
            "minus": './assets/reactables/reddit/minus.png',
            "pin": './assets/reactables/reddit/pin.png'
        },
        "emoji": retoEmojis.reactables.reddit
    }
}