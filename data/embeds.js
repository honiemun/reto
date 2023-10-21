const { Guild, GuildMember, ButtonStyle } = require("discord.js");
const Setup = require("../classes/setup")

// Schema
const guildSchema = require('../schemas/guild');

// Data
const reactablePacks = require('./reactablePacks');

// TO-DO: Functions should be async whereever possible

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
            /*
            // TO-DO: Delete - for debugging only!!
            {
                id: "skipTo",
                label: "Skip to Pin Threshold",
                style: ButtonStyle.Primary,
                disabled: false,
                next: "pinThreshold"
            },
            */
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
- Create an optional \`#best-of\` channel, and send messages to it using a **Pin** Reactable.
- Set up your own server-specific Karma.
- Send a confirmation message or reaction each time someone uses a Reactable.

⚠️ *Advanced setup is experimental and may have some bugs.*`
                },
                {
                    "name": "Quick setup",
                    "inline": true,
                    "value": `
The default settings - get to the fun in no time!
This will create for you:

- A ` + reactablePacks.reto.emoji.plus + ` **plus** and ` + reactablePacks.reto.emoji.minus + ` **minus** emoji. Anyone can vote on their favourite messages with these!
- A ` + reactablePacks.reto.emoji.pin + ` **pin** emoji that will send whatever post is reacted to it to a newly created \`#best-of\` channel.
- A \`@Curator\` role - people with this role can use the **pin** emoji to send messages to the \`#best-of\` channel.
- Sets up confirmations as a Reaction.

*(All these features can be modified later down the line.)*`
                // TO-DO: Re-implement "[...] and/or a Pinnable Threshold." on Advanced setup
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
                nextFunction: async function(msgInt) {
                    const guild = await guildSchema.findOne({
                        guildId: msgInt.guild.id
                    });
                    return guild ? "startFromScratch" : "publicServer";
                },
                disabled: false,
            }
        ]
    },
    {
        id: "startFromScratch",
        embed: {
            color: 0,
            title: "Start from scratch?",
            description: `
You're starting a **Quick Setup.** Do you want to delete the **Custom Emoji**, **Roles** and **Autovote Rules** that Reto generated for you, or would you like to reuse them (where possible?)

- To keep your pinned messages safe, *Pinnable Channels* will be unlinked but not deleted.
- Karma totals will not be affected.
- You can manually remove the unused emoji, channels and roles from your server anytime.`,
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

We're going to set-up the most basic of Reto reactables first: a **Plus** and **Minus** reactable, which will add +1 and -1 to your Karma when reacted, and a **Pin** reactable, which will send any messages reacted with it to a special channel.

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
                id: "plusSkip",
                label: "Skip",
                style: ButtonStyle.Secondary,
                next: "minusReactable",
                disabled: false
            }
        ],
        selector: {
            id: "plusReactable",
            placeholder: "Select a Plus Emoji",
            minValues: 1,
            maxValues: 5,
            populate: function (client, guildId) {
                // Fetch emoji

                const guild = client.guilds.cache.get(guildId);
                let emojis = [];

                guild.emojis.cache.forEach((emoji) => {
                    emojis.push({
                        label: ":" + emoji.name + ":",
                        value: emoji.id,
                        emoji: emoji.toString(),
                        next: "minusReactable"
                    })
                });

                return emojis.slice(0, 17);
            },
            options: [
                {
                    label: "Reto (recommended)",
                    value: "reto",
                    emoji: reactablePacks.reto.emoji.plus,
                    next: "minusReactable"
                },
                {
                    label: "Heart",
                    value: "❤",
                    emoji: "❤",
                    next: "minusReactable"
                },
                {
                    label: "Thumbs-up",
                    value: "👍",
                    emoji: "👍",
                    next: "minusReactable"
                },
                {
                    label: "Arrow",
                    value: "⬆️",
                    emoji: "⬆️",
                    next: "minusReactable"
                },
                {
                    label: "Checkmark",
                    value: "✔",
                    emoji: "✔",
                    next: "minusReactable"
                },
                {
                    label: "Green Checkmark",
                    value: "✅",
                    emoji: "✅",
                    next: "minusReactable"
                },
                {
                    label: "Reddit",
                    value: "reddit",
                    emoji: reactablePacks.reddit.emoji.plus,
                    next: "minusReactable"
                }
            ],
            function: function(components, guild) { Setup.createCustomReactable("plus", components, guild); }
        }

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
                id: "minusSkip",
                label: "Skip",
                style: ButtonStyle.Secondary,
                next: "pinnableChannel",
                disabled: false
            }
        ],
        selector: {
            id: "minusReactable",
            placeholder: "Select a Minus Emoji",
            minValues: 1,
            maxValues: 5,
            populate: function (client, guildId) {
                // Fetch emoji

                const guild = client.guilds.cache.get(guildId);
                let emojis = [];

                guild.emojis.cache.forEach((emoji) => {
                    emojis.push({
                        label: ":" + emoji.name + ":",
                        value: emoji.id,
                        emoji: emoji.toString(),
                        next: "pinnableChannel"
                    })
                });

                return emojis.slice(0, 18);
            },
            options: [
                {
                    label: "Reto (recommended)",
                    value: "reto",
                    emoji: reactablePacks.reto.emoji.minus,
                    next: "pinnableChannel"
                },
                {
                    label: "Broken Heart",
                    value: "💔",
                    emoji: "💔",
                    next: "pinnableChannel"
                },
                {
                    label: "Thumbs-down",
                    value: "👎",
                    emoji: "👎",
                    next: "pinnableChannel"
                },
                {
                    label: "Arrow",
                    value: "⬇️",
                    emoji: "⬇️",
                    next: "pinnableChannel"
                },
                {
                    label: "Cross",
                    value: "❌",
                    emoji: "❌",
                    next: "pinnableChannel"
                },
                {
                    label: "Green Cross",
                    value: "❎",
                    emoji: "❎",
                    next: "pinnableChannel"
                },
                {
                    label: "Reddit",
                    value: "reddit",
                    emoji: reactablePacks.reddit.emoji.minus,
                    next: "pinnableChannel"
                }
            ],
            function: function(components, guild) { Setup.createCustomReactable("minus", components, guild); }
        }

    },
    {
        id: "pinnableChannel",
        embed: {
            color: 0,
            title: "Create a Pinnable Channel",
            description: `
With Reto, you can send extra-special messages to a special, _Pinnable Channel_, by using a special Reactable or after it passing a Karma Amount.

Create a new channel *(\`#best-of\`, by default)*, or assign an existing channel below.`
        },
        components: [
            {
                id: "pinChannelSkip",
                label: "Skip",
                style: ButtonStyle.Secondary,
                next: "publicServer",
                disabled: false
            }
        ],
        selector: {
            id: "pinnableChannel",
            placeholder: "Create or select a Pinnable Channel",
            populate: function (client, guildId) {
                // Fetch channels

                const guild = client.guilds.cache.get(guildId);
                let guilds = [];

                guild.channels.cache.forEach((channel) => {
                    if (channel.type == 0) { // Only Text Channels
                        guilds.push({
                            label: "#" + channel.name,
                            value: channel.id,
                            next: "pinReactable" // "pinThreshold"
                        })
                    }
                });

                return guilds.slice(0, 24);
            },
            options: [
                {
                    label: "Create a new channel (#best-of)",
                    value: "createBestOf",
                    emoji: "✨",
                    next: "pinReactable" // "pinThreshold"
                }
            ],
            function: function(components, guild) { Setup.setPinnableChannel(components, guild); }
        },
        
    },
    // TO-DO: Pin Thresholds are currently not in use!
    {
        id: "pinThreshold",
        embed: {
            color: 0,
            title: "Create a Pinning Threshold",
            description: `
With a Pinning Threshold, any member of your server can use your Karma-giving Reactables to send messages to the Pinnable Channel you've created.

This is similar to _Starboard_ functions in other bots.`
        },
        components: [
            {
                id: "setThreshold",
                label: "Set a Threshold",
                style: ButtonStyle.Primary,
                next: "pinReactable",
                disabled: false,
                modal: {
                    id: "thresholdModal",
                    title: "Set a Threshold",
                    next: "pinReactable",
                    inputs: [
                        {
                            id: "threshold",
                            label: "Pinning Threshold",
                            placeholder: "How much Karma is needed to pin a message?",
                            required: true,
                            longForm: false,
                            validation: "number"
                        }
                    ]
                }
            },
            {
                id: "plusSkip",
                label: "Skip",
                style: ButtonStyle.Secondary,
                next: "pinReactable",
                disabled: false
            }
        ],
    },
    {
        id: "pinReactable",
        embed: {
            color: 0,
            title: "Setting up the Pin reactable",
            description: `
> The **Pin** reactable immediately sends a message to the Pinnable Channel you've assigned.

Select an emoji from the list below to create this Reactable.`
        },
        components: [
            {
                id: "pinSkip",
                label: "Skip",
                style: ButtonStyle.Secondary,
                next: "publicServer",
                disabled: false
            }
        ],
        selector: {
            id: "pinReactable",
            placeholder: "Select a Pin Emoji",
            minValues: 1,
            maxValues: 5,
            populate: function (client, guildId) {
                // Fetch emoji

                const guild = client.guilds.cache.get(guildId);
                let emojis = [];

                guild.emojis.cache.forEach((emoji) => {
                    emojis.push({
                        label: ":" + emoji.name + ":",
                        value: emoji.id,
                        emoji: emoji.toString(),
                        next: "pinReactableRoles"
                    })
                });

                return emojis.slice(0, 18);
            },
            options: [
                {
                    label: "Reto (recommended)",
                    value: "reto",
                    emoji: reactablePacks.reto.emoji.pin,
                    next: "pinReactableRoles"
                },
                {
                    label: "Star",
                    value: "⭐",
                    emoji: "⭐",
                    next: "pinReactableRoles"
                },
                {
                    label: "Glowing Star",
                    value: "\uD83C\uDF1F",
                    emoji: "\uD83C\uDF1F",
                    next: "pinReactableRoles"
                },
                {
                    label: "Pin",
                    value: "\uD83D\uDCCC",
                    emoji: "\uD83D\uDCCC",
                    next: "pinReactableRoles"
                },
                {
                    label: "Round Pin",
                    value: "\uD83D\uDCCD",
                    emoji: "\uD83D\uDCCD",
                    next: "pinReactableRoles"
                },
                {
                    label: "Reddit",
                    value: "reddit",
                    emoji: reactablePacks.reddit.emoji.pin,
                    next: "pinReactableRoles"
                },
            ],
            function: function(components, guild) { Setup.createCustomReactable("pin", components, guild); }
        }

    },
    {
        id: "pinReactableRoles",
        embed: {
            color: 0,
            title: "Role lock the Pin Reactable",
            description: `
With the Pin Reactable, any person can send any message to the Pinnable Channel. It's recommended you set it up so only people with high server roles have access to it.

Do you want to lock the Pin Reactable to a specific role?`
        },
        components: [
            {
                id: "pinRoleSkip",
                label: "Don't add a role lock",
                style: ButtonStyle.Secondary,
                next: "publicServer",
                disabled: false
            }
        ],
        selector: {
            id: "pinnableChannel",
            placeholder: "Create or select a Pinnable Channel",
            minValues: 1,
            maxValues: 5,
            populate: function (client, guildId) {
                // Fetch channels

                const guild = client.guilds.cache.get(guildId);
                let roles = [];

                guild.roles.cache.forEach((role) => {
                    if (role.name != "@everyone") { // Skip @everyone
                        roles.push({
                            label: "@" + role.name,
                            value: role.id,
                            next: "publicServer"
                        })
                    }
                });

                return roles.slice(0, 24);
            },
            options: [
                {
                    label: "Create a new role (@Curator)",
                    value: "createCurator",
                    emoji: "✨",
                    next: "publicServer"
                }
            ],
            function: function(components, guild) { Setup.setRoleLock(components, guild); }
        }
    },
    {
        id: "publicServer",
        embed: {
            color: 0,
            title: "Do you want your server to be Public?",
            description: `
With Reto, you can find the top-voted messages in every Public server the bot is in using \`/discover\` - and check out the Global Post Leaderboards to see the best messages throughout all Discord!

If you'd like the best posts from this server to be featured for anyone to find, you can set it as **Public**. If this is a private server, you might want to opt-out and set it as **Private**.`,
        },
        components: [
            {
                id: "serverPublic",
                label: "Set server as Public",
                next: "newsletter",
                style: ButtonStyle.Primary,
                function: function(guild) { Setup.setPublicServer(guild, true); }
            },
            {
                id: "serverPrivate",
                label: "Set server as Private",
                next: "newsletter",
                style: ButtonStyle.Secondary,
                function: function(guild) { Setup.setPublicServer(guild, false); }
            }
        ]
    },
    {
        id: "newsletter",
        embed: {
            color: 0,
            title: "Reto Newsletter",
            description: `
Reto is constantly being updated with new commands and features!

If you'd like to hear what's new in Reto *(once a month, don't worry!)*, consider **Subscribing** to hear the latest news in your Pinnable Channel. Otherwise, we'll send minimal updates whenever there's critical information or major Events.`,
        },
        components: [
            {
                id: "subscribe",
                label: "Subscribe to the Newsletter",
                next: "done",
                style: ButtonStyle.Primary,
                function: function(guild) { Setup.setNewsletterSubscription(guild, true); }
            },
            {
                id: "minimal",
                label: "Get minimal news",
                next: "done",
                style: ButtonStyle.Secondary,
                function: function(guild) { Setup.setNewsletterSubscription(guild, false); }
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