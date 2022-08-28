import { Client, MessageEmbed, TextChannel } from 'discord.js'
import WOKCommands from 'wokcommands'

export default (client: Client, instance: WOKCommands) => {
    function sendErrorToConsole (reason: any, parameter: any) {
        const date = new Date();
        console.log("[" + date.toISOString() + "] ❗" + reason + " (" + parameter + ")");
    }

    function sendErrorToChannel (reason: any, parameter: any, channel?: TextChannel) {
        if (!process.env.ERROR_CHANNEL) return;

        let newChannel;
        !channel ? newChannel = client.channels.cache.get(process.env.ERROR_CHANNEL) : newChannel = channel;
        if (!newChannel) return;

        (newChannel as TextChannel).send({embeds: [createErrorEmbed(reason, parameter)]});
    }

    function createErrorEmbed(reason: any, parameter: any) {
        const date = new Date();
        return new MessageEmbed()
            .setColor("RED")
            .setTitle("⚠️ Error")
            .setFooter({text: date.toISOString() });
    }

    function handleError(reason: any, parameter: any) {
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
}

const config = {
  displayName: 'Error Handler',
  dbName: 'ERROR HANDLER'
}

export { config }
