client.on('messageReactionAdd', async (reaction, user) => {
	// Partial messages are those that haven't been cached,
	// and require being fetched before use.
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			return;
		}
	}

	console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
	console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
});