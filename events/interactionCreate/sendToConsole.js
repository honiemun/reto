module.exports = async (interaction) => {
    const cmdName = await getCommandName(interaction);
    const cmdOptions = await getCommandOptions(interaction);

    console.log("🤖 " + interaction.user.tag.gray + " used ".gray + cmdName);
    if (cmdOptions) console.log(cmdOptions);
}

async function getCommandName(interaction) {
    const cmdGroup = interaction.options.getSubcommandGroup();
    const cmd = interaction.options.getSubcommand(false);

    let cmdName;

    if (!cmdGroup && !cmd)  cmdName = interaction.commandName; // /interaction
    if (cmdGroup && !cmd)   cmdName = interaction.commandName + " " + cmdGroup; // /interaction type
    if (!cmdGroup && cmd)   cmdName = interaction.commandName + " " + cmd; // This one should not happen.
    if (cmdGroup && cmd)    cmdName = interaction.commandName + " " + cmdGroup + " " + cmd;

    return "/" + cmdName;
}

async function getCommandOptions(interaction) {
    const options = interaction.options._hoistedOptions;
    let optionArray = [];

    if (!options.length) return false;

    for (const option of options) {
        optionArray.push(option.name.gray + ": ".gray + option.value);
    }

    return "  └── ".gray + optionArray.join("\n  └── ".gray);
}