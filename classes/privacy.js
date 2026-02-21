const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require("discord.js");

// Schemas
const userSchema = require('../schemas/user');
const memberSchema = require('../schemas/member');
const messageSchema = require('../schemas/message');
const reactionSchema = require('../schemas/reaction');
const pinnedEmbedSchema = require('../schemas/pinnedEmbed');
const guildSchema = require('../schemas/guild');

class Privacy {
    
    constructor() {
        if (Privacy._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Privacy._instance = this;
    }

    // Discovery and Public Messages
    async toggleDiscovery (interaction, isServer) {
        const allow = interaction.options.getBoolean("allow");
        
        if (isServer) await this.setPublicGuild(interaction.guild, allow);
        else await this.setPublicUser(interaction.user, allow);

        const embed = new EmbedBuilder()
            .setTitle((isServer ? interaction.guild.name + " has" : "You have") + " opted " + (allow ? "in to" : "out of") + " Discovery.")
            .setDescription("Reto will " + (allow ? "now" : "no longer") + " show some of your " +  (isServer ? "server's" : "account's") + " messages to people from other servers through `/discover`" + (!isServer && !allow ? ", regardless of whether this is enabled on your current server." : "."))

        return interaction.editReply({ embeds: [embed] });
    }

    async setPublicGuild (guild, enable) {
        const update = await guildSchema.findOneAndUpdate(
            { guildId: guild.id },
            { $set : { public: enable } },
            { upsert: false }
        ).exec();
        
        return update;
    }
    
    async setPublicUser (user, enable) {
        const update = await userSchema.findOneAndUpdate(
            { userId: user.id },
            { $set : { public : enable } },
            { upsert: false }
        ).exec();

        console.log(enable);
        console.log(update);
        
        return update;
    }

    // Data exporting
    async exportUserData (interaction) {
        // Current schemas that store user data:
        // - User
        // - Member
        // - Message
        // - Reaction
        // Update this function as more schemas are added.

        const user = await userSchema.findOne({ userId: interaction.user.id }).exec();
        const members = await memberSchema.find({ userId: interaction.user.id }).exec();
        const messages = await messageSchema.find({ userId: interaction.user.id }).exec();
        const reactions = await reactionSchema.find({ userId: interaction.user.id }).exec();

        const data = {
            user: user,
            members: members,
            messages: messages,
            reactions: reactions
        }

        const jsonFile = new AttachmentBuilder(Buffer.from(JSON.stringify(data)), {
            name: "retoUserData_" + interaction.user.id + "_" + Date.now() + ".json",
        });
        
        // Send embed in DMs
        const channel = await interaction.user.createDM();

        const embedGuild = new EmbedBuilder()
            .setTitle("📬 Check your DMs!")
            .setDescription("To protect your sensitive user data, we've sent you a message through Discord DMs. Take a look!");

        const embedDM = new EmbedBuilder()
            .setTitle("User data export")
            .setDescription("Here is your Reto user data, as requested! You can download it as a .JSON file and read at your leisure.");
        
        try {
            await interaction.user.send({ embeds: [embedDM], files: [jsonFile] });
            await interaction.editReply({ embeds: [embedGuild] });
        } catch (e) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("Couldn't send DM!")
                .setDescription("We weren't able to send you a DM. Please make sure your DMs are open and try again.")
                .setColor("Red");
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }

    // Data deleting
    async confirmDeletionOfUserData (interaction) {
        const confirmationEmbed = new EmbedBuilder()
            .setTitle("Are you sure you want to delete your Reto user data?")
            .setDescription(`
This action is irreversible, and you will lose all of your data stored with Reto. Once you confirm, your data will be purged from Reto's servers immediately.

This will remove:
- Your **User and Member** data, including Server and Global Karma counts, Badges and privacy settings
- Your **Message and Reaction** data, including individual Karma counts
- The deletion of any **Pinned Messages** that might have been sent to any Pinnable Channels

_If you want to keep a copy of your data, you can export it first using the \`/privacy personal export\` command._`)
            .setColor("Red");

        const confirmButton = new ButtonBuilder()
            .setLabel("Yes, delete my data")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🗑️")
            .setCustomId("delete");
        
        const confirmation = await interaction.editReply({ embeds: [confirmationEmbed], components: [ new ActionRowBuilder().addComponents(confirmButton) ], fetchReply: true });
		
        const filter = (i) => ['delete'].includes(i.customId) && i.user.id === interaction.user.id;
		const time = 1000 * 60 * 5; // 5 minutes
        const collector = confirmation.createMessageComponentCollector({ filter, max: 1, time });

		collector.on('collect', async i => {
            await this.deleteUserData(interaction);
		});
    }

    async deleteUserData (interaction) {
        await this.deletePinnedEmbeds(interaction);

        await userSchema.deleteMany({ userId: interaction.user.id }).exec();
        await memberSchema.deleteMany({ userId: interaction.user.id }).exec();
        await messageSchema.deleteMany({ userId: interaction.user.id }).exec();
        await reactionSchema.deleteMany({ userId: interaction.user.id }).exec();
        
        const embed = new EmbedBuilder()
            .setTitle("Sad to see you go!")
            .setColor("Red")
            .setDescription(`
**Your Reto user data has been deleted succesfully.**

If you wish to stop Reto from collecting more data, please kick the bot off the server. You can also control how we handle your data using \`/privacy\`.

If you plan to continue using Reto, we'll continue to store data on you, your messages and reactions according to our [Privacy Policy](https://retobot.com/legal/privacy-policy). No further action is required.`);

        await interaction.editReply({ embeds: [embed], components: [] });
    }

    async deletePinnedEmbeds (interaction) {
        const messages = await messageSchema.aggregate([
            { $match: { "userId": interaction.user.id } },
            {
                $lookup: {
                    from: "pinnedembeds",
                    localField: "pinnedEmbeds",
                    foreignField: "_id",
                    as: "pinnedEmbedObjects"
                }
            }
        ]).exec();

        for (const message of messages) {
            if (!message.pinnedEmbedObjects.length) continue;
            console.log("Deleting pinned embed: " + message.pinnedEmbedObjects[0].pinnedEmbedId);

            await this.deletePinnedEmbed({
                id: message.pinnedEmbedObjects[0].channelId,
                embed: message.pinnedEmbedObjects[0].pinnedEmbedId
            }, interaction.client);
        }
    }

    async deletePinnedEmbed(iterableChannel, client) {
        try {
            const channel = await client.channels.fetch(iterableChannel.id);
            await channel.messages.delete(iterableChannel.embed);
        } catch (e) {
            console.log("❌ Couldn't delete pinned message! ".red + "(ID: ".gray + iterableChannel.embed + " | " + e.message + ")".gray);
        }

        await pinnedEmbedSchema.deleteOne({
            pinnedEmbedId: iterableChannel.embed
        }).exec();
    }
}

module.exports = new Privacy();