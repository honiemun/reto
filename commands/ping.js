const { CommandType } = require("wokcommands");

module.exports = {
	category: 'Testing',
	description: 'Replies with Pong!',

	type: CommandType.SLASH,
	guildOnly: false,

	callback: ({ message, instance, interaction }) => {
        return "**🏓 Pong!**";
	},
}