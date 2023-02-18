import I18n from '../classes/i18n';
import { ICommand } from "wokcommands";

export default {
	category: 'Testing',
	description: 'Replies with Pong!',

	slash: 'both',
	testOnly: true, // This only works for test servers!
	guildOnly: false,

	callback: ({ message, instance, interaction }) => {
        return I18n.translate("PING", instance, message, interaction);
	},
} as ICommand