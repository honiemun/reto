const { ActionRowBuilder, ButtonBuilder } = require('discord.js');

class Scroll {

    // Helper class for anything that needs to scroll with button navigation.

    constructor() {
        if (Scroll._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Scroll._instance = this;
    }

    async createScrollableList(interaction, content, userId) {
        /* TO-DO:
         - Do we need the concept of Pages?
         - Figure out how to fetch content at runtime from a function
         - And how to reload this content once we've ran out of messages to send
         */
        let pages = {};
        pages[userId] = pages[userId] || 0;
        let page = pages[userId];
    
        const updatePage = async (newPage) => {
            pages[userId] = newPage;
            const embeds = content[newPage].embeds;
            const components = content[newPage].components || [{ type: 'prev' }, { type: 'post' }];
            const message = content[newPage].message;
    
            await interaction.editReply({
                content: message,
                embeds: embeds,
                components: [await this.getScrollRow(components, newPage, content)]
            });
        };
    
        const embeds = content[page].embeds;
        const components = content[page].components || [{ type: 'prev' }, { type: 'post' }];
        const message = content[page].message;
    
        let collector;
    
        const filter = (i) => i.user.id === userId;
        const time = 1000 * 60 * 5;
    
        const sentEmbed = await interaction.editReply({
            embeds: embeds,
            components: [await this.getScrollRow(components, page, content)]
        });
    
        collector = sentEmbed.createMessageComponentCollector({ filter, time });
    
        collector.on('collect', async (i) => {
            if (!i) { return; }
    
            await i.deferUpdate();
    
            if (i.customId !== 'prev_embed' && i.customId !== 'next_embed') { return; }
    
            if (i.customId === 'prev_embed' && page > 0) {
                page--;
            } else if (i.customId === 'next_embed' && page < content.length - 1) {
                page++;
            }
    
            await updatePage(page);
        });
    
        collector.on('end', (collected, reason) => {
            if (reason === "messageDelete") return;
            interaction.editReply({ components: [] });
        });
    }
    
    async getScrollRow(components, page, content) {
        const row = new ActionRowBuilder();
    
        for (const component of components) {
            switch (component.type) {
                case 'prev':
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_embed')
                            .setStyle('Secondary')
                            .setEmoji('⬅️')
                            .setDisabled(page === 0)
                    );
                    break;
                case 'post':
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('next_embed')
                            .setStyle('Secondary')
                            .setEmoji('➡️')
                            .setDisabled(page === content.length - 1)
                    );
                    break;
                default:
                    let buttonBuilder = new ButtonBuilder()
                        .setStyle(component.style)
                        .setDisabled(component.disabled ? component.disabled : false);
    
                    if (component.emoji) buttonBuilder.setEmoji(component.emoji);
                    if (component.label) buttonBuilder.setLabel(component.label);
    
                    if (component.url) {
                        buttonBuilder.setURL(component.url);
                    } else {
                        buttonBuilder.setCustomId(component.id);
                    }
    
                    row.addComponents(buttonBuilder);
                    break;
            }
        }
    
        return row;
    }
    
    
}

module.exports = new Scroll();

