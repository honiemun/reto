const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// Schemas
const reactableSchema = require("../schemas/reactable");

// Classes
const Embed = require("../classes/embed");


class Autocomplete {
    
    constructor() {
        if (Autocomplete._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Autocomplete._instance = this;
    }

    async getAutocompleteType(type) {
        switch (type) {
            case "reactable":
                return {
                    database: reactableSchema,
                    formatting: function(reactable) {
                        return reactable.name.charAt(0).toUpperCase() + reactable.name.slice(1)
                    },
                    deformatting: function(name) {
                        return {name: name.toLowerCase()}
                    }
                }
            default:
                return {}
        }
    }

    async autocomplete(type, query) {
        var autocomplete = await this.getAutocompleteType(type);

        var reactableList = [];
        const reactables = await autocomplete.database.find(query).exec();

        for (const reactable of reactables) {
            reactableList.push(autocomplete.formatting(reactable));
        }

        return reactableList;
    }

    async autocompleteValidate(type, query, response, interaction) {
        var query = await this.autocompleteNameToQuery(type, query, response);

        if (query) {
            return query;
        } else {
            await Embed.createErrorEmbed("The " + type + " `" + response + "` isn't valid! Please select one from the list.").then(async function (errorEmbed) {
				await interaction.editReply({ embeds: [ errorEmbed ] })
			})
			return false;
        }
    }

    async autocompleteNameToQuery(type, query, response) {
        var autocomplete = await this.getAutocompleteType(type);
        console.log({...query, ...autocomplete.deformatting(response)});
        return await autocomplete.database.findOne({...query, ...autocomplete.deformatting(response)}).exec();
    }
    

}

module.exports = new Autocomplete();