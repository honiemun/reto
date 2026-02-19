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
 * Usage (standalone, e.g. ReactableChecks):
 *   const ps = new PaginatedSelector(selectorConfig, options);
 *   const reply = await interaction.update({ components: [ps.buildPage(0), buttonRow] });
 *   ps.attachStandaloneCollector(reply, userId, onSelect, { extraRows: [buttonRow] });
 *
 * Usage (via Embed class):
 *   buildSelectorRow() constructs the paginator and createCollector() drives it.
 */
class PaginatedSelector {

    /**
     * @param {object}   selector    - Config: { id, placeholder, minValues?, maxValues? }
     * @param {Array}    allOptions  - Full flat list of { label, value, description?, emoji? }
     * @param {Function} onSelect    - Called with (value, interactionValues, interaction) on real selection (Embed path)
     * @param {object}   [buttonRow] - Optional ActionRowBuilder to preserve alongside the selector on page flips (Embed path)
     * @param {number}   [startPage] - Which page to begin on
     */
    constructor(selector, allOptions, onSelect = null, buttonRow = null, startPage = 0) {
        this.selector   = selector;
        this.options    = allOptions;
        this.onSelect   = onSelect;
        this.buttonRow  = buttonRow;
        this.page       = startPage;
        this.pages      = this._paginate(allOptions);
        this.totalPages = this.pages.length;
        this.collector  = null;
    }

    // Pagination

    /**
     * Pre-computes page boundaries, accounting for nav slots on each page.
     * @param {Array} options
     * @returns {Array<Array>} Array of per-page option arrays
     */
    _paginate(options) {
        if (options.length <= 25) return [options];

        const pages = [];
        let i = 0;

        while (i < options.length) {
            const hasPrev      = pages.length > 0;
            const remaining    = options.length - i;
            const willHaveNext = remaining > (25 - (hasPrev ? 1 : 0));
            const navSlots     = (hasPrev ? 1 : 0) + (willHaveNext ? 1 : 0);
            const slotSize     = 25 - navSlots;

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

        // Nav: previous
        if (page > 0) {
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('← Previous page')
                    .setDescription(`Page ${page}/${this.totalPages}`)
                    .setValue('__paginate_prev__')
            );
        }

        // Nav: next
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

    // Collector (Embed class path)

    /**
     * Attaches a collector driven by the Embed class.
     * Page flips are handled via msgInt.editReply, preserving the button row.
     *
     * @param {Message}     message  - The reply message to collect on
     * @param {Interaction} msgInt   - The original deferred interaction (for editReply)
     * @param {string}      userId   - Filter to this user
     * @param {number}      [time]   - Timeout in ms (default 5 min)
     */
    attachCollector(message, msgInt, userId, time = 1000 * 60 * 5) {
        const filter = (i) => i.user.id === userId;
        this.collector = message.createMessageComponentCollector({ filter, time });

        this.collector.on('collect', async (i) => {
            // Ignore button interactions — those belong to createCollector in embed.js
            if (!i.isStringSelectMenu()) return;

            const value = i.values?.[0];

            if (value === '__paginate_next__') {
                await i.deferUpdate();
                const row = this.buildPage(this.page + 1);
                const components = this.buttonRow ? [this.buttonRow, row] : [row];
                await msgInt.editReply({ components });
                return;
            }

            if (value === '__paginate_prev__') {
                await i.deferUpdate();
                const row = this.buildPage(this.page - 1);
                const components = this.buttonRow ? [this.buttonRow, row] : [row];
                await msgInt.editReply({ components });
                return;
            }

            // Real selection
            const selected = this.options.find(o => o.value === value);
            this.collector.stop('selected');
            await this.onSelect(selected, i.values, i);
        });

        this.collector.on('end', (_, reason) => {
            if (reason === 'selected' || reason === 'navigated' || reason === 'messageDelete') return;
            msgInt.editReply({ components: [] }).catch(() => {});
        });
    }

    // Collector (standalone path)

    /**
     * Attaches a collector for standalone use (e.g. ReactableChecks).
     * Page flips use i.update() directly on the interaction.
     * Extra rows (e.g. a Reset button row) are preserved alongside the selector on every page flip.
     *
     * @param {Message}     message           - The reply message to collect on
     * @param {string}      userId            - Filter to this user
     * @param {Function}    onSelect          - Called with (value, interaction) on a real selection
     * @param {object}      [opts]
     * @param {Array}       [opts.extraRows]  - Additional ActionRowBuilders to keep alongside the selector
     * @param {number}      [opts.time]       - Timeout in ms (default 5 min)
     * @param {Function}    [opts.onTimeout]  - Called if collector times out without a selection
     */
    attachStandaloneCollector(message, userId, onSelect, { extraRows = [], time = 1000 * 60 * 5, onTimeout } = {}) {
        const filter = (i) => i.user.id === userId && i.isStringSelectMenu() && i.customId === this.selector.id;
        this.collector = message.createMessageComponentCollector({ filter, time });

        this.collector.on('collect', async (i) => {
            const value = i.values?.[0];

            if (value === '__paginate_next__') {
                const row = this.buildPage(this.page + 1);
                await i.update({ components: [row, ...extraRows] });
                return;
            }

            if (value === '__paginate_prev__') {
                const row = this.buildPage(this.page - 1);
                await i.update({ components: [row, ...extraRows] });
                return;
            }

            // Real selection — stop and hand off
            this.collector.stop('selected');
            await onSelect(value, i);
        });

        this.collector.on('end', (_, reason) => {
            if (reason === 'selected' || reason === 'messageDelete') return;
            if (onTimeout) onTimeout();
        });
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    stop(reason = 'stopped') {
        this.collector?.stop(reason);
    }
}

module.exports = PaginatedSelector;