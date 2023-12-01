const ContextMenu = require("../../classes/handler/contextMenu");

module.exports = async (interaction, client) => {
    if (!interaction.isMessageContextMenuCommand()) return;
    console.log("🗯 " + interaction.user.tag.gray + " used ".gray + interaction.commandName);

    await ContextMenu.execute(client, interaction);
}