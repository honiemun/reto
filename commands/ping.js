const I18n = require("../classes/i18n");

module.exports = {
	category: 'Testing',
	description: 'Replies with Pong!',

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: false,

	callback: ({ message, instance, interaction }) => {
        return I18n.translate("PING", instance, message, interaction);
	},
}