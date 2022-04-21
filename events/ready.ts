import Events from "../classes/events";

class Ready extends Events {
	async run () {
		console.log("Ready!");
	}
}