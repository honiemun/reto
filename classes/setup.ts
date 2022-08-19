import { Guild } from 'discord.js';
import guildSchema from '../schemas/guild';
import reactableSchema from '../schemas/reactable';

export default class Setup {

    static async quickSetup (guild: Guild) {
        /*
            TO-DO:
            - Implement default emoji creation
            - Implement #best-of channel creation
            - Implement @Curator creation
        */

        // Store guild data
        this.createGuild({
			guildId: guild.id
		});

        // Store emoji data
        this.createReactable({
            guildId: guild.id,
            globalKarma: true,

            emojiIds: ['👍'],
            karmaAwarded: 1,
            messageConfirmation: 'You have been awarded 1 karma!'
        });
        this.createReactable({
            guildId: guild.id,
            globalKarma: true,

            emojiIds: ['👎'],
            karmaAwarded: 1,
            messageConfirmation: 'You have been awarded -1 karma!'
        });
        this.createReactable({
            guildId: guild.id,
            globalKarma: true,

            emojiIds: ['📌'],
            sendsToChannel: 1234,
            lockedBehindRoles: [1234],
            messageConfirmation: 'Banger tweet, bestie!'
        });
    }

    static async createGuild (guild: Object) {
        const newGuild = new guildSchema(guild);
        return newGuild.save();
    }

    static async createReactable (reactable: Object) {
        const newReactables = new reactableSchema(reactable);
        return newReactables.save();
    }
}