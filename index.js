const { Client, GatewayIntentBits, Partials, ActivityType } = require("discord.js");

const WOK = require("wokcommands");
const path = require("path");
const mongoose = require("mongoose");
const figlet = require("figlet");
const colors = require("colors");
const pack = require('./package.json');

const contextMenu = require('./classes/handler/contextMenu.js')

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

client.on("ready", async () => {
	// Generate boot-up code
	let serverCount = client.guilds.cache.size;

	figlet("                 retool", { font: "Ogre" }, function (err, data) {
		console.log(data.red)
		console.log(pack.version.underline + " | " + "A reaction bot for the modern era".gray + " | " + "👥 Live in ".gray + serverCount + " servers".gray)
		console.log("🔗 https://discord.com/oauth2/authorize?client_id=".gray + process.env.CLIENT_ID.gray + "&permissions=".gray +  process.env.PERMISSIONS.gray + "&scope=bot%20applications.commands".gray)
	})

	// Instantiate WOKCommands
	new WOK({
		client,
		commandsDir: path.join(__dirname, 'commands/slash'),
		//featuresDIr: path.join(__dirname, "features"),
		events: {
			dir: path.join(__dirname, 'events')
		},
		testServers: [
			'952707420700934195', // Retool Development
		],
		botOwners: [
			'690962744454938734', // Honiemun
		],
		disabledDefaultCommands: [
			// TO-DO: See which of these are actually useful
			WOK.DefaultCommands.ChannelCommand,
			WOK.DefaultCommands.CustomCommand,
			WOK.DefaultCommands.Prefix,
			WOK.DefaultCommands.RequiredPermissions,
			WOK.DefaultCommands.RequiredRoles,
			WOK.DefaultCommands.ToggleCommand
		],
		mongoUri: process.env.MONGO_URI
	});

	// Instantiate Context Menu commands
	await contextMenu.handler();
	
	// Warning activity if bot is being debugged
	if (process.env.DEBUG_MODE) {
		client.user.setActivity('⚠️ Debugging! Bot may be unstable', { type: ActivityType.Custom });
	}
});

client.login(process.env.TOKEN);