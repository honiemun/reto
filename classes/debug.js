// Dependencies
const { REST, Routes } = require('discord.js');

class Debug {

    constructor() {
        if (Debug._instance) {
            throw new Error("Singleton classes can't be instantiated more than once.")
        }
        Debug._instance = this;
    }
    
    async deleteCommands(interaction) {
        // TO-DO: Only support for Global commands

        const id = interaction.options.getString("id");
        let confirmation;

        const rest = new REST().setToken(process.env.TOKEN);

        if (id) {
            confirmation = 'Successfully deleted the Slash Command (with the ID `' + id + '`).';

            rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, id))
                .then(() => console.log(confirmation))
                .catch(console.error);
        } else {
            confirmation = 'Successfully deleted all Slash Commands.';

            rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
                .then(() => console.log(confirmation))
                .catch(console.error);
        }

        interaction.editReply(confirmation);
    }
}

module.exports = new Debug();

