/*  If self-hosting, you'll need to create custom emoji:
    https://discord.com/developers/applications/[CLIENT_ID]/emojis
    "Production" and "Debug" environments depend on DEBUG_MODE env variable. */

const emojiSets = {
    production: {
        karmaEmoji: '<:karma:1472314899039522866>',
        confirmationEmoji: '<a:retoolconfirm:1472314897499947099>',
        loadingEmoji: '<a:loading:1472314900549337344>',
        dottedLineEmoji: '<:dottedline:1472314902030061782>',
        reactables: {
            reto: {
                plus: '<:retoolplus:1472314883805810750>',
                minus: '<:retoolminus:1472314885076422746>',
                pin: '<:retoolpin:1472314887156797611>'
            },
            reddit: {
                plus: '<:redditplus:1472314890021634068>',
                minus: '<:redditminus:1472314892315918388>',
                pin: '<:redditpin:1472314894295633961>'
            }
        }
    },
    debug: {
        karmaEmoji: '<:karma:1265828472752963585>',
        confirmationEmoji: '<a:retoolconfirm:1265827708865216665>',
        loadingEmoji: '<a:loading:1265828678667993109>',
        dottedLineEmoji: '<:dottedline:1265828864878317630>',
        reactables: {
            reto: {
                plus: '<:retoolplus:1265826661455368192>',
                minus: '<:retoolminus:1265826692837019728>',
                pin: '<:retoolpin:1265826722138292326>'
            },
            reddit: {
                plus: '<:redditplus:1265826746201149480>',
                minus: '<:redditminus:1265826768053469227>',
                pin: '<:redditpin:1265826786416005120>'
            }
        }
    }
};

const env = JSON.parse(process.env.DEBUG_MODE) ? 'debug' : 'production';
module.exports = emojiSets[env];