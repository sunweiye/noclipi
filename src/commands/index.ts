import {Command} from './Command';
import {NginxCommand} from "./nginx";
import {HelpCommand} from "./help";
import {LocalizationCommand} from "./localization";

type CommandsList = Record<string, Function>

abstract class CommandFactory {
    private static commandsList: CommandsList = {};

    private static commandsInstances: Map<string, Command> = new Map<string, Command>();

    public static getCommandsList(): CommandsList {
        return CommandFactory.commandsList;
    }

    public static addCommandToList(commnadName: string, commandClass: Function): void {
        CommandFactory.commandsList[commnadName] = commandClass;
    }

    public static getCommand(commandName: string): Command {
        let commandNameInLower = commandName.toLowerCase(),
            command: Command = CommandFactory.commandsInstances.get(commandNameInLower);
        if(!command) {
            if(!CommandFactory.commandsList[commandNameInLower]) {
                throw new Error(`${commandName} is not a valid command.`);
            }
            command = new (<any> CommandFactory.commandsList)[commandName.toLowerCase()]();
            CommandFactory.commandsInstances.set(commandNameInLower, command);
        }

        return command;
    }
}

// TODO: Use namespace for the commands and enable the add in the configuration by reading yaml
CommandFactory.addCommandToList('nginx', NginxCommand);
CommandFactory.addCommandToList('help', HelpCommand);
CommandFactory.addCommandToList('localization', LocalizationCommand);

export {CommandFactory};
