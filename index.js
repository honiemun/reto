const { Client, GatewayIntentBits, Partials } = require("discord.js");
const WOK = require("wokcommands");
const path = require("path");
const mongoose = require("mongoose");
const cachegoose = require("recachegoose");
const figlet = require("figlet");
const colors = require("colors");
var pack = require('./package.json');

require("dotenv/config");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent
	],
	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.Reaction
	]
});



mongoose.set('strictQuery', true);
cachegoose(mongoose, {
	engine: 'memory'
});

client.on("ready", () => {
	// Generate boot-up code
	figlet("      retool", { font: "Ogre" }, function (err, data) {
		console.log(data.red)
		console.log(pack.version.underline + " | " + "A reaction bot for the modern era".gray)
		// TO-DO: Add link to invite
	})

	// Instantiate WOKCommands
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