// Dependencies
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require('path');

// Data
const defaultReactables = require('../data/defaultReactables');

// Schemas
const guildSchema = require('../schemas/guild');
const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const messageSchema = require('../schemas/message');
const reactableSchema = require('../schemas/reactable');
const reactionSchema = require('../schemas/reaction');

// Classes
const Embed = require("../classes/embed");
const Setup = require("../classes/setup");

class Port {

    constructor() {
        if (Port._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Port._instance = this;
    }
    

    async legacyImport(interaction) {
        const legacyPath = path.join(__dirname, '../export/legacy')
        let imported = {};

        if (!fs.existsSync(legacyPath)) {
            const error = await Embed.createErrorEmbed("Can't find the legacy files!\nMake sure the exported files are available in the `/export/legacy` directory.");
            interaction.followUp({ embeds: [error] });
        }
        
        // Get all the files in one neat array
        fs.readdir(legacyPath, async (err, files) => {
            if (err) {
                const error = await Embed.createErrorEmbed(err);
                return interaction.followUp({ embeds: [error] });
            }
            
            files.forEach(file => {
                const filePath = path.join(legacyPath, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                imported[file.split('.')[0]] = data;
            })
            
            const table = interaction.options.getString("table");
            switch (table) {
                case "guilds":
                    await this.importGuildData(imported, interaction);
                    break;
                case "users":
                    await this.importUserData(imported, interaction);
                    break;
                case "messages":
                    await this.importMessageData(imported, interaction);
                    break;
                default:
                    await this.importData(imported, interaction);
                    break;
            }
        })
        

        return await interaction.editReply({ embeds: [ new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("⏳ Importing...")
                .setDescription("**Getting everything ready!**")
            ]
        });
    }

    async importData(imported, interaction) {

        await this.importGuildData(imported, interaction);
        await this.importUserData(imported, interaction);
        await this.importMessageData(imported, interaction);

        /*
        TODO:
        - Reaction (maybe??)
        */
    }

    async importGuildData(imported, interaction) {
        // Create a guild and its Reactables
        for (const [entry, server] of Object.entries(imported.srv)) {
            await this.generateImportEmbed("Guild and Reactables data", entry, imported.srv, interaction, 5)

            if (!server.serverid) continue;
            const serverId = server.serverid.toString();
            const bestOf = imported.best.find((srv) => { return srv.serverid === serverId });
            
            var notificationMode = false
            if (bestOf && bestOf.notification == "message") notificationMode = true;

            guildSchema.findOneAndUpdate(
                { guildId: serverId }, // to string
                { $set : { 
                    guildId: serverId,
                    karmaName: server.karmaname,
                    karmaEmoji: server.karmaemoji,
                    messageConfirmation: notificationMode,
                    public: server.global
                }},
                { upsert: true }
            ).exec();

            // Create Reactables
            // TO-DO:
            /*  - Separate into another function
                - Generate new emoji for Reactables
                    - Rename 10 to Pin
                    - Change original emotes to new versions
                    - Don't make changes, apart from name, to modified emoji
            */
            
            const reactableList = [
                {
                    "name": "plus",
                    "message": bestOf && "plusMessage" in bestOf ? bestOf["plusMessage"] : undefined,
                    "id": server.heart
                },
                {
                    "name": "minus",
                    "message": bestOf && "minusMessage" in bestOf ? bestOf["minusMessage"] : undefined,
                    "id": server.crush
                },
                {
                    "name": "pin",
                    "message": bestOf && "10Message" in bestOf ? bestOf["10Message"] : undefined,
                    "id": server.star
                }
            ]

            for (const reactable of reactableList) {
                const findObject = {
                    guildId: serverId,
                    emojiIds: reactable.id
                }

                const currentReactables = await reactableSchema.find(findObject);
                if (!currentReactables.length) {
                    if (!reactable.id) continue; // Some servers chose to opt out of certain reactables.
                    const defaultReactable = defaultReactables.find(react => react.name === reactable.name);
                    const emojis = defaultReactable.emojiIds.concat(reactable.id);

                    reactableSchema.findOneAndUpdate(
                        { guildId: serverId },
                        { $set : { 
                            guildId: serverId,
                            globalKarma: true,

                            name: defaultReactable.name,
                            emojiIds: emojis,
                            karmaAwarded: defaultReactable.karmaAwarded,
                            reactionThreshold: defaultReactable.reactionThreshold,
                            lockedBehindRoles: defaultReactable.lockedBehindRoles,
                            
                            sendsToChannel: bestOf && defaultReactable.name == "pin" ? bestOf.channelid.toString() : undefined,

                            reactionConfirmationDescription: reactable.message
                        }},
                        { upsert: true }
                    ).exec();
                }
            }
        }
    }

    async importUserData(imported, interaction) {
        // Create an user and member
        for (const [entry, user] of imported.db.entries()) {

            await this.generateImportEmbed("User and Member data", entry, imported.db, interaction, 25)

            // User
            if (!user.username) continue;

            const privacy = imported.priv.find((priv) => { return priv.username === user.username });
            var canStoreMessages = true;
            if (privacy && privacy.mode == true) canStoreMessages = false;

            userSchema.findOneAndUpdate(
                { userId: user.username },
                { 
                    $set : { 
                        userId: user.username,
                        canStoreMessages: canStoreMessages,
                        earlySupporter: true
                    },
                    $max : { 
                        globalKarma: { $max: [ user.points, "$globalKarma" ] }
                    }
                },
                { upsert: true }
            ).exec();

            // Member
            for (const memberServer of user.servers) {
                memberSchema.findOneAndUpdate(
                    { guildId: memberServer,
                        userId: user.username },
                    {
                        $set : { 
                            guildId: memberServer,
                            userId: user.username,
                        },
                        $max : {
                            karma: { $max: [ memberServer in user ? user[memberServer] : 0, "$karma" ] }
                        }
                    },
                    { upsert: true }
                ).exec();
            }
        }
    }

    async importMessageData(imported, interaction) {
        // Create messages
        for (const [entry, message] of imported.post.entries()) {
            
            await this.generateImportEmbed("Message data", entry, imported.post, interaction, 25)

            console.log(message.points);

            // Message
            messageSchema.findOneAndUpdate(
                { messageId: message.msgid },
                {
                    $set : { 
                        messageId: message.msgid,
                        userId: message.username,
                        guildId: message.servers
                    },
                    $max : {
                        karma: { $max: [ message.points, "$karma" ] }
                    }
                },
                { upsert: true }
            ).exec();

            // Reactions are not set, as we can't determine
            // with which Reactable the person has reacted.
        }
    }

    async generateImportEmbed(dataType, entry, database, interaction, step) {
        // Only edit every N entries, for speed!
        if (entry % step === 0 || entry >= Object.entries(database).length - 1) {
            try {
                await interaction.editReply({ embeds: [ new EmbedBuilder()
                        .setColor("Yellow")
                        .setTitle("⏳ Importing...")
                        .setDescription("**" + dataType + "** (" + entry + "/" + Object.entries(database).length + ')')
                    ]
                });
            } catch (err) {
                console.log(err);
            }
        } 
    }
}

module.exports = new Port();