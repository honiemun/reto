const { CommandType } = require("wokcommands");

const Formatting = require("../../classes/formatting");
const Scroll	 = require("../../classes/scroll");

module.exports = {
	category: 'Personalisation',
	description: 'Shows a complete list of every modifier that can be used for customising text.',

	type: CommandType.SLASH,
	guildOnly: false,
	testOnly: true,

	callback: async ({ user, message, interaction }) => {
		await interaction.deferReply();
		const formattingCategories = await Formatting.getFormattingDescriptions(message);
		const embeds = [];
	
		for (const [name, formattingCategory] of Object.entries(formattingCategories)) {
			let generatedEmbed = {
				"title": name,
				"description": "** **",
				"fields": []
			}
	
			for (const [identifier, rule] of Object.entries(formattingCategory)) {
				generatedEmbed.fields.push({
					"name": "`{" + identifier + "}` - " + rule.name,
					"value": rule.description
				});
			}
	
			embeds.push({
				embeds: [generatedEmbed]
			});
		}
		
		console.log(embeds);
		await Scroll.createScrollableList(interaction, embeds, user.id);
	},
}