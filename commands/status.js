const { ActivityType, ApplicationCommandOptionType } = require("discord.js");
const { CommandType } = require("wokcommands");

module.exports = {
	category: 'Configuration',
	description: 'Sets the bots status.',

	options: [
        {
            name: "activity",
            description: "The bot's bio for what it's currently doing.",
            type: ApplicationCommandOptionType.String,
			required: true,
        },
		{
			name: "status",
			description: "The bot's current status. Online by default.",
			type: ApplicationCommandOptionType.String,
			required: false,
			choices: [
				{
					name: "Online",
					value: "online"
				},
				{
					name: "Idle",
					value: "idle"
				},
				{
					name: "Do Not Disturb",
					value: "dnd"
				},
				{
					name: "Invisible",
					value: "invisible"
				}
			]
		},
		{
			name: "type",
			description: "The bot's current type of activity. Custom Status by default.",
			type: ApplicationCommandOptionType.String,
			required: false,
			choices: [
				{
					name: "Custom Status",
					value: "custom-status"
				},
				{
					name: "Playing",
					value: "playing"
				},
				{
					name: "Watching",
					value: "watching"
				},
				{
					name: "Listening to",
					value: "listening"
				},
				{
					name: "Competing in",
					value: "competing"
				}
			]
		},
	],

	type: CommandType.SLASH,
	ownerOnly: true,

	callback: async ({ client, interaction }) => {
		const activity = interaction.options.getString('activity');
		const status = interaction.options.getString('status') || "online";
		const typeRaw = interaction.options.getString('type') || "custom-status";
		let type;

		// Gotta be a better way...
		switch (typeRaw) {
			case "custom-status":
				type = ActivityType.Custom;
				break;
			case "playing":
				type = ActivityType.Playing;
				break;
			case "watching":
				type = ActivityType.Watching;
				break;
			case "listening":
				type = ActivityType.Listening;
				break;
			case "competing":
				type = ActivityType.Competing;
				break;
		}
		
		client.user.setPresence({
			activities: [{
				type: type,
				name: activity,
				state: activity,
			}],
			status: status // TO-DO: Does NOT work!!
		});

		return '✨ Status set to `' + activity + '`!';
	}
}