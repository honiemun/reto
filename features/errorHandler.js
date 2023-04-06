const { Client, MessageEmbed, TextChannel } = require("discord.js");
const WOK = require("wokcommands");
const Embed = require("../classes/embed");

module.exports = (client, instance) => {
    function sendErrorToConsole (reason, parameter) {
        const date = new Date();
        console.log("[" + date.toISOString() + "] ❗" + reason + " (" + parameter + ")");
    }

    function sendErrorToChannel (reason, parameter, channel) {
        if (!process.env.ERROR_CHANNEL) return;

        let newChannel;
        !channel ? newChannel = client.channels.cache.get(process.env.ERROR_CHANNEL) : newChannel = channel;
        if (!newChannel) return;

        newChannel.send({embeds: [Embed.createErrorEmbed(reason)]});
    }

    function handleError(reason, parameter) {
        sendErrorToConsole(reason, parameter);
        sendErrorToChannel(reason, parameter);
    }

    // WOKCommands errors. Not really sure if this works?
	instance.on('commandException', (command, message, error) => {
        const reason = "Error found while running command " + command;
        sendErrorToConsole(reason, error);
        sendErrorToChannel(reason, error); // Dev channel
        sendErrorToChannel(reason, error, message.channel); // Channel where the command was run
	});

    // Regular errors
    /*
    process.on("uncaughtException", (reason, parameter) => {
        handleError(reason, parameter);
    });
    process.on("unhandledRejection", (reason, parameter) => {
        handleError(reason, parameter);
    });
    process.on("uncaughtExceptionMonitor", (reason, parameter) => {
        handleError(reason, parameter);
    });
    process.on("multipleResolves", (reason, parameter) => {
        handleError(reason, parameter);
    });
    */
}

module.exports.config = {
  displayName: 'Error Handler',
  dbName: 'ERROR HANDLER'
}
