const { CommandType } = require("wokcommands");
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const mongoose = require('mongoose');

// Classes
const Personalisation = require("../classes/personalisation");
const Embed = require("../classes/embed");

// Schemas
const reactableSchema = require("../schemas/reactable");

class Scroll {

    // Helper class for anything that needs to scroll with button navigation.

    constructor() {
        if (ReactionConfirmation._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        ReactionConfirmation._instance = this;
    }

    async createScrollEmbed (interaction, content) {
    }
    
}

module.exports = new Scroll();

