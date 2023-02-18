import { GuildMember, User } from "discord.js";
import { MessageEmbed } from 'discord.js';

export default class Profile {

    static async fetchProfileEmbed(author: GuildMember | User) {
        if (author == null) return;
        let username = author instanceof GuildMember ? author.nickname : author.username
        if (!username) return;

        return new MessageEmbed()
			.setTitle(username)
			.setDescription('');
    }
}