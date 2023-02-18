import DiscordJS, { Intents } from 'discord.js';
import WOKCommands from 'wokcommands';
import path from 'path';
import dotenv from 'dotenv';

// Gives access to .env variables.
dotenv.config();

const client = new DiscordJS.Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS
	],
	partials: [
		'MESSAGE',
		'CHANNEL',
		'REACTION'
	]
});

client.on('ready', async () => {
	new WOKCommands(client, {
		commandsDir: path.join(__dirname, 'commands'),
		featuresDir: path.join(__dirname, 'features'),
		messagesPath: path.join(__dirname, 'i18n/messages.json'),
		typeScript: true,
		testServers: [
			'952707420700934195', // Retool Development
		],
		botOwners: [
			'690962744454938734', // Honiemun
		],
		mongoUri: process.env.MONGO_URI
	});
});


client.login(process.env.TOKEN);