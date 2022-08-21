import { Client, MessageEmbed, TextChannel } from 'discord.js'
import WOKCommands from 'wokcommands'

export default (client: Client, instance: WOKCommands) => {
    function generateGuruMeditation (errorType: string) {
        // Just a string I can ask for to reference the error back,
        // without asking the end user to take a screenshot.
        return errorType + "-" + Math.floor(Date.now() / 1000);
    }

    function sendErrorToConsole (reason: any, parameter: any, guruMeditation: string) {
        console.log("❗" + reason + " (" + parameter + ")\n🧘: " + guruMeditation);
    }

    function sendErrorToChannel (reason: any, parameter: any, guruMeditation: string, channel?: TextChannel) {
        if (!process.env.ERROR_CHANNEL) return;

        let newChannel;
        !channel ? newChannel = client.channels.cache.get(process.env.ERROR_CHANNEL) : newChannel = channel;
        if (!newChannel) return;

        (newChannel as TextChannel).send({embeds: [createErrorEmbed(reason, parameter, guruMeditation)]});
    }

    function createErrorEmbed(reason: any, parameter: any, guruMeditation: string) {
        return new MessageEmbed()
            .setColor("RED")
            .setTitle("⚠️ Error")
            .setDescription("Looks like something went wrong!\nFeel free to try again - and if that doesn't help, ask in our [support server](" + process.env.SUPPORT_SERVER + ").\n\n```js\n" + reason + "\n\n" + parameter + "```")
            .setTimestamp()
            .setFooter({text: "🧘: " + guruMeditation});
    }

    function handleError(reason: any, parameter: any, errorType: string) {
        const guru = generateGuruMeditation(errorType);
        sendErrorToConsole(reason, parameter, guru);
        sendErrorToChannel(reason, parameter, guru);
    }

    // WOKCommands errors. Not really sure if this works?
	instance.on('commandException', (command, message, error) => {
        const reason = "Error found while running command " + command;
        const guru = generateGuruMeditation("COMEXC");
        sendErrorToConsole(reason, error, guru);
        sendErrorToChannel(reason, error, guru); // Dev channel
        sendErrorToChannel(reason, error, guru, message.channel); // Channel where the command was run
	});

    // Regular errors
    process.on("uncaughtException", (reason, parameter) => {
        handleError(reason, parameter, "UNCEXC");
    });
    process.on("unhandledRejection", (reason, parameter) => {
        handleError(reason, parameter, "UNHREJ");
    });
    process.on("uncaughtExceptionMonitor", (reason, parameter) => {
        handleError(reason, parameter, "UNCMON");
    });
    process.on("multipleResolves", (reason, parameter) => {
        handleError(reason, parameter, "MULRES");
    });
}

const config = {
  displayName: 'Error Handler',
  dbName: 'ERROR HANDLER'
}

export { config }
