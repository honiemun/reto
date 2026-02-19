const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');

/**
 * PaginatedSelector
 *
 * Wraps a flat list of options into a paginated Discord dropdown.
 * Works standalone or via the Embed class (which calls buildPage()).
 *
 * Usage (standalone):
 *   const ps = new PaginatedSelector(selector, options, onSelect);
 *   const actionRow = ps.buildPage(0);
 *   await interaction.editReply({ components: [actionRow] });
 *   ps.attachCollector(message, interaction, userId);
 *
 * Usage (via Embed class):
 *   Embed.createSelector() detects selector.paginated = true and
 *   delegates to this class automatically.
 */
class PaginatedSelector {

    /**
     * @param {object}   selector          - The selector config object from embeds.js
     * @param {Array}    allOptions         - Full flat list of options (already resolved/populated)
     * @param {Function} onSelect          - Called with (selectedOption, interactionValues) when a real option is chosen
     * @param {number}   [startPage=0]     - Which page to begin on
     */
    constructor(selector, allOptions, onSelect, buttonRow = null, startPage = 0) {
        this.selector   = selector;
        this.options    = allOptions;
        this.onSelect   = onSelect;
        this.page       = startPage;
        this.buttonRow  = buttonRow;
        this.pages      = this._paginate(allOptions);
        this.totalPages = this.pages.length;
    }


    _paginate(options) {
        if (options.length <= 25) return [options];

        const pages = [];
        let i = 0;

        while (i < options.length) {
            const hasPrev     = pages.length > 0;
            const remaining   = options.length - i;
            const willHaveNext = remaining > (25 - (hasPrev ? 1 : 0));
            const navSlots    = (hasPrev ? 1 : 0) + (willHaveNext ? 1 : 0);
            const slotSize    = 25 - navSlots;

            pages.push(options.slice(i, i + slotSize));
            i += slotSize;
        }

        return pages;
    }

    // Page building

    /**
     * Returns an ActionRowBuilder for the given page number.
     * @param {number} page
     * @returns {ActionRowBuilder}
     */
    buildPage(page = this.page) {
        this.page = page;

        const select = new StringSelectMenuBuilder()
            .setCustomId(this.selector.id)
            .setPlaceholder(this.selector.placeholder);

        if (this.selector.minValues) select.setMinValues(this.selector.minValues);
        if (this.selector.maxValues) select.setMaxValues(this.selector.maxValues);

        for (const option of this.pages[page]) {
            const opt = new StringSelectMenuOptionBuilder()
                .setLabel(option.label)
                .setValue(option.value);
            if (option.description) opt.setDescription(option.description);
            if (option.emoji)       opt.setEmoji(option.emoji);
            select.addOptions(opt);
        }

        if (page > 0) {
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('← Previous page')
                    .setDescription(`Page ${page}/${this.totalPages}`)
                    .setValue('__paginate_prev__')
            );
        }

        if (page < this.totalPages - 1) {
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Next page →')
                    .setDescription(`Page ${page + 2}/${this.totalPages}`)
                    .setValue('__paginate_next__')
            );
        }

        return new ActionRowBuilder().addComponents(select);
    }

    stop() {
        this.collector?.stop('navigated');
    }
}

module.exports = PaginatedSelector;