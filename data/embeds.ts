import { Guild } from "discord.js";
import Setup from "../classes/setup"

export const embeds = [
    {
        id: "chooseSetupType",
        embed: {
            color: 0,
            title: "Welcome to Reto's setup wizard!",
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
                style: "PRIMARY",
                disabled: false,
                function: function(guild: Guild) { Setup.quickSetup(guild); }
            },
            {
                id: "advancedSetup",
                label: "Advanced setup",
                style: "SECONDARY",
                disabled: true
            }
        ]
    },
    {
        id: "quickSetup",
        embed: {
            color: 0,
            title: "Quick setup",
            description: "Placeholder"
        },
        components: [
            {
                id: "plus",
                label: "Plus",
                style: "PRIMARY",
                disabled: false
            },
            {
                id: "minus",
                label: "Minus",
                style: "SECONDARY",
                disabled: false
            }
        ]
    }
]