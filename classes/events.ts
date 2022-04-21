import { Client } from "discord.js";

export default class Events {

	name: String;
	partials: string[];
	client: any = Client;
	type: string;
	options: any = {};
	emitter: any;
	store: any;
	file: any;

	constructor(client: any = Client, name: String, options: any = {}) {
		this.name = name;
		this.partials = ['MESSAGE', 'CHANNEL', 'REACTION', 'GUILD_MEMBER', 'USER', 'GUILD_MESSAGE_REACTIONS'];
		this.client = client;
		this.type = options.once ? 'once' : 'on';
		this.emitter = (typeof options.emitter === 'string' ? this.client[options.emitter] : options.emitter) || this.client;
	}

	// eslint-disable-next-line no-unused-vars
	async run(...args: any[]) {
		throw new Error(`The run method has not been implemented in ${this.name}`);
	}

	reload() {
		return this.store.load(this.file.path);
	}
}