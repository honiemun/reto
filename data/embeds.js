const { Guild, GuildMember, ButtonStyle } = require("discord.js");
const Setup = require("../classes/setup")

module.exports = [
    {
        id: "setup",
        embed: {
            title: "Welcome to Reto's setup wizard!",
            description: "To get started using Reto, we need to set up some things first.\n\n",
            fields: [
                {
                    "name": "Before we begin...",
                    "value": `
Please, take a moment to read through our Privacy Policy! (Don't worry, it's not written in dense legalese.)

*The short of it:*
- Whenever someone reacts to a message you sent, Reto keeps logs of its contents for up to 30 days.
- Reto keeps track of the servers both you and it are in.
- If the server is set to Public, other people may see the messages you sent that have been reacted to over a vote threshold.
- You can delete or receive a copy of your data at any time!`
                }
            ],
            footer: {
                text: "By continuing this setup, you agree to our Privacy Policy and Terms of Service."
            }
        },
        components: [
            {
                id: "chooseSetupType",
                label: "Let's get started!",
                style: ButtonStyle.Primary,
                disabled: false,
            },
            {
                id: "privacyPolicy",
                label: "Privacy policy",
                style: "Link",
                url: "https://retobot.com/privacy-policy",
                disabled: false
            },
            {
                id: "termsOfService",
                label: "Terms of service",
                style: "Link",
                url: "https://retobot.com/terms-of-service",
                disabled: false
            },
        ]
    },
    {
        id: "chooseSetupType",
        embed: {
            color: 0,
            title: "Choose your setup type:",
            description: "To get started, pick out what kind of setup process you'd like.",
            fields: [
                {
                    "name": "Advanced setup",
                    "inline": true,
                    "value": `
Want to customise Reto to the fullest?
Use the Advanced wizard to make the bot your own!

- Choose if you want the default **Plus** and/or **Minus** Reactables.
- Create an optional \`#best-of\` channel, and send messages to it using a **Pin** Reactable and/or Democracy Mode *(a message vote threshold).*
- Set up your own server-specific Karma.
- Send a confirmation message or reaction each time someone uses a Reactable.`
                },
                {
                    "name": "Quick setup",
                    "inline": true,
                    "value": `
The default settings - get to the fun in no time!
This will create for you:

- A <:plus:1004190494844264509> **plus** and <:minus:1004190495964139540> **minus** emoji. Anyone can vote on their favourite messages with these!
- A <:10:1004190492650647594> **pin** emoji that will send whatever post is reacted to it to a newly created \`#best-of\` channel.
- A \`@Curator\` role - people with this role can use the **pin** emoji to send messages to the \`#best-of\` channel.
- Sets up confirmations as a Reaction.

*(All these features can be modified later down the line.)*`
                }
            ]
        },
        components: [
            {
                id: "advancedSetup",
                label: "Advanced setup",
                style: ButtonStyle.Primary,
                disabled: false,
                next: "introReactables"
            },
            {
                id: "quickSetup",
                label: "Quick setup",
                style: ButtonStyle.Secondary,
                next: "startFromScratch",
                disabled: false,
            }
        ]
    },
    {
        // TO-DO: Skip if this is the first time running Setup!!
        id: "startFromScratch",
        embed: {
            color: 0,
            title: "Start from scratch?",
            description: `
You're starting a **Quick Setup.** Do you want to delete the **Custom Emoji**, **Pinnable Channels** and **Roles** that Reto generated for you, or would you like to reuse them (where possible?)

If you choose not to delete these, you can manually remove the unused emoji, channels and roles from your server anytime.`,
            footer: {
                text: "Warning: This action is irreversible!"
            }
        },
        components: [
            {
                id: "keepOldData",
                label: "Keep old data",
                style: ButtonStyle.Secondary,
                next: "publicServer",
                disabled: false,
                function: function(guild, member) { Setup.quickSetup(guild, member, false); }
            },
            {
                id: "eraseOldData",
                label: "Erase old data",
                style: ButtonStyle.Danger,
                next: "publicServer",
                disabled: false,
                function: function(guild, member) { Setup.quickSetup(guild, member, true); }
            }
        ]
    },
    {
        id: "introReactables",
        embed: {
            color: 0,
            title: "Introduction to Reactables",
            description: `
**Reactables** are the heart of Reto - reacting to a message with any of these can kick off tons of functionality!

We're going to set-up the most basic of Reto reactables first: a **Plus** and **Minus** emoji, which will add +1 and -1 to your Karma when reacted, and a **Pin** reactable, which will send any messages reacted with it to a special channel.

All of these Reactables are optional, and you can customize their functionality later down the line.`,
        },
        components: [
            {
                id: "reactableConfirm",
                label: "Got it!",
                style: ButtonStyle.Primary,
                next: "plusReactable",
                disabled: false
            }
        ]
    },
    {
        id: "plusReactable",
        embed: {
            color: 0,
            title: "Setting up the Plus reactable",
            description: `
> The **Plus** reactable adds \`+1\` to the Karma of anyone you react to.

Select an emoji from the list below to create this Reactable.`
        },
        components: [
            {
                id: "default",
                emoji: "<:plus:1004190494844264509>",
                style: ButtonStyle.Success,
                next: "minusReactable",
                disabled: false
            },
            {
                id: "heart",
                emoji: "❤",
                style: ButtonStyle.Primary,
                next: "minusReactable",
                disabled: false
            },
            {
                id: "hand",
                emoji: "👍",
                style: ButtonStyle.Primary,
                next: "minusReactable",
                disabled: false
            },
            {
                id: "arrow",
                emoji: "⬆️",
                style: ButtonStyle.Primary,
                next: "minusReactable",
                disabled: false
            },
            {
                id: "plusSkip",
                label: "Skip",
                style: ButtonStyle.Secondary,
                next: "minusReactable",
                disabled: false
            }
        ],

    },
    {
        id: "minusReactable",
        embed: {
            color: 0,
            title: "Setting up the Minus reactable",
            description: `
> The **Minus** reactable adds \`-1\` to the Karma of anyone you react to.

Select an emoji from the list below to create this Reactable.`
        },
        components: [
            {
                id: "default",
                emoji: "<:minus:1004190495964139540>",
                style: ButtonStyle.Success,
                next: "publicServer",
                disabled: false
            },
            {
                id: "heart",
                emoji: "💔",
                style: ButtonStyle.Primary,
                next: "publicServer",
                disabled: false
            },
            {
                id: "hand",
                emoji: "👎",
                style: ButtonStyle.Primary,
                next: "publicServer",
                disabled: false
            },
            {
                id: "arrow",
                emoji: "⬇️",
                style: ButtonStyle.Primary,
                next: "publicServer",
                disabled: false
            },
            {
                id: "plusSkip",
                label: "Skip",
                style: ButtonStyle.Secondary,
                next: "publicServer",
                disabled: false
            }
        ],

    },
    {
        id: "publicServer",
        embed: {
            color: 0,
            title: "Do you want your server to be Public?",
            description: "With Reto, you can find the top-voted messages in every Public server the bot is in using `/explore` - and check out the Global Post Leaderboards to see the best messages throughout all Discord!\n\nIf you'd like the best posts from this server to be featured for anyone to find, you can set it as **Public**. If this is a private server, you might want to opt-out and set it as **Private**.",
        },
        components: [
            {
                id: "serverPublic",
                label: "Set server as Public",
                next: "done",
                style: ButtonStyle.Primary,
                disabled: false,
                function: function(guild) { Setup.setPublicServer(guild); }
            },
            {
                id: "serverPrivate",
                label: "Set server as Private",
                next: "done",
                style: "Secondary",
                disabled: false
            }
        ]
    },
    {
        id: "done",
        embed: {
            color: 0,
            title: "Setup complete!",
            description: `
You're all set up! You can now use Reto in your server!
To change any of these settings, you can re-run \`/setup\` anytime.

A Getting Started guide is available on your designated pinned channel, or by using the \`/guide\` command.
Thank you for using Reto!`,
        
            fields: [
                {
                    "name": "❔ Need any help?",
                    "inline": false,
                    "value": "[Join the support server](" + process.env.SUPPORT_SERVER + ") if you've got any issues, to report bugs or suggest features!"
                },
                {
                    "name": "🌟 Go Beyond",
                    "inline": false,
                    "value": "If you enjoy Reto, consider becoming a **Reto Gold** member to gain exclusive access to more customization features and support Reto's development!"
                }
            ]
        },

        components: [
            {
                id: "retoGold",
                label: "Go Gold",
                style: ButtonStyle.Link,
                url: "https://retobot.com/gold"
            },
            {
                id: "supportServer",
                label: "Support server",
                style: ButtonStyle.Link,
                url: process.env.SUPPORT_SERVER
            }
        ]
    }
]