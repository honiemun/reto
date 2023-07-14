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
                    "value": "Please, take a moment to read through our Privacy Policy! (Don't worry, it's not written in dense legalese.)\n\n*The short of it:*\n★ Whenever someone reacts to a message you sent, Reto keeps logs of its contents for up to 30 days.\n★ Reto keeps track of the servers both you and it are in.\n★ If the server is set to Public, other people may see the messages you sent that have been reacted to over a vote threshold.\n★ You can delete or export your data at any time!"
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
                url: "https://retobot.gg/privacy-policy",
                disabled: false
            }
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
                    "name": "Quick setup",
                    "inline": true,
                    "value": "The one most people will need.\nThis will create for you:\n\n★ A <:plus:1004190494844264509> **plus** and <:minus:1004190495964139540> **minus** emoji. Anyone can vote on their favourite messages with these!\n★ A <:10:1004190492650647594> **bestof** emoji that will send whatever post is reacted to it to a new `#best-of` channel.\n★ A `@Curator` role - people with this role can use the **bestof** emoji to send messages to the `#best-of` channel.\n★ Sets the server as Public, meaning the funniest messages can be discovered with `/explore`.\n★ Sets up confirmations as a Reaction.\n\n*(All these features can be modified later down the line.)*"
                },
                {
                    "name": "Advanced setup",
                    "inline": true,
                    "value": "Want to customise Reto to the fullest?\nUse the Advanced wizard to make the bot your own!\n\n★ Choose if you want the default **+1** and/or **-1** Reactables.\n★ Create an optional `#best-of` channel, and send messages to it using an exclusive emoji or Democracy Mode *(a message vote threshold).*\n★ Create your own server-specific Reactables!\n★ Choose if you'd like your server's messages to remain Public or Private.\n★ Send a confirmation message or reaction each time someone uses a Reactable.\n\n*(This is currently in development.)*"
                }
            ]
        },
        components: [
            {
                id: "quickSetup",
                label: "Quick setup",
                style: ButtonStyle.Primary,
                next: "publicServer",
                disabled: false,
                function: function(guild, member) { Setup.quickSetup(guild, member); }
            },
            {
                id: "advancedSetup",
                label: "Advanced setup",
                style: "Secondary",
                disabled: true
            }
        ]
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
            description: "You're all set up! You can now use Reto in your server!\nTo change any of these settings, you can re-run `/setup` anytime.\n\nA Getting Started guide is available on your designated `#best-of` channel, or by using the `/guide` command. *(currently not implemented)*\n\nThanks for using Reto!\n[Join the support server](" + process.env.SUPPORT_SERVER + ") for help, or to report bugs or suggest features!",
        }
    }
]