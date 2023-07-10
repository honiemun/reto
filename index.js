const { Client, GatewayIntentBits, Partials } = require("discord.js");
const WOK = require("wokcommands");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv/config");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions
	],
	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.Reaction
	]
});



mongoose.set('strictQuery', true);

client.on("ready", () => {
	console.log('ready');
	new WOK({
		client,
		commandsDir: path.join(__dirname, 'commands'),
		featuresDIr: path.join(__dirname, "features"),
		events: {
			dir: path.join(__dirname, 'events')
		},
		messagesPath: path.join(__dirname, 'i18n/messages.json'),
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