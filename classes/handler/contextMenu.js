const { Routes, REST, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

class ContextMenu {

    constructor() {
        if (ContextMenu._instance) {
          throw new Error("Singleton classes can't be instantiated more than once.")
        }
        ContextMenu._instance = this;
    }

    async handler () {
		const commandFiles = await this.getCommandsFromDirectory();
        const commands = await this.createCommandsFromDirectory(commandFiles);
		if (commands.length) await this.registerCommands(commands, commandFiles);
    }

	async execute (client, interaction) {
		const commands = await this.getCommandsFromDirectory();
		const command = commands.find(cmd => cmd.commandName === interaction.commandName);
	  
		if(command) {
		  try {
			await command.callback({client, interaction});
		  } catch (error) {
			console.error('Error executing command:'.red, error);
		  }
		} else {
		  console.log('No command found matching ' .red, interaction.commandName); 
		}
	}

    async getCommandsFromDirectory() {
        const fs = require('fs');
        const path = require('path');
        
        const contextPath = path.join(__dirname, '../../commands/context');
		const files = await fs.promises.readdir(contextPath);

		let commands = [];
        
        for (const file of files) {
			// Create commands
			const filePath = path.join(contextPath, file);
				if (path.extname(file) === '.js') {
				try {
					const commandModule = require(filePath);
					if (commandModule && commandModule.commandName) {
						commands.push(commandModule);
					} else {
						console.log(`${file}: commandName not found.`);
					}
				} catch (error) {
					console.error(`Error on ${file}: `.red, error);
				}
			}
        }

		return commands;
    }

	async createCommandsFromDirectory(commandFiles) {
		let createdCommands = [];

		for (const command of commandFiles) {
			createdCommands.push(await this.createCommand(command));
		}

		return createdCommands;
	}

	async createCommand(commandModule) {
		return new ContextMenuCommandBuilder()
			.setName(commandModule.commandName)
			.setType(commandModule.type)
	}

    async registerCommands(commands, commandFiles) {
		let globalCommands = [];
		let guildCommands = [];

		for (const commandFile of commandFiles) {
			const createdCommand = commands.find(cmd => cmd.name === commandFile.commandName);

			if (commandFile.testOnly) {
				guildCommands.push(createdCommand);
			} else {
				globalCommands.push(createdCommand);
			}
		}

		const rest = new REST().setToken(process.env.TOKEN);

		(async () => {
			try {
				if (globalCommands.length) {
					const globalData = await rest.put(
						Routes.applicationCommands(process.env.CLIENT_ID),
						{ body: globalCommands },
					);
					
					console.log("Refreshed ".gray + globalData.length + " context menu commands".gray);
				}
				
				if (guildCommands.length) {
					const guildData = await rest.put(
						Routes.applicationGuildCommands(process.env.CLIENT_ID, '952707420700934195'), // TO-DO: Replace
						{ body: guildCommands },
					);
					
					console.log("Refreshed ".gray + guildData.length + " test-only context menu commands".gray);
				}
			} catch (error) {
				console.error("Error while registering context menu commands: ", error);
			}
		})();
    }
}

module.exports = new ContextMenu();