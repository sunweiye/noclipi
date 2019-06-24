import {Configuration} from '../Configuration';
import {CommandFactory} from '../commands/';

const commandLineArgs: any = require('command-line-args');

class ArgumentsParser {
    private static instance: ArgumentsParser;

    public static getInstance(...args: Array<any>): ArgumentsParser {
        if(!ArgumentsParser.instance) {
            ArgumentsParser.instance = new ArgumentsParser();
        }
        return ArgumentsParser.instance;
    }

    public parse(): string {
        let argumentsConfiguration = Configuration.getInstance().getConfig('arguments'),
            commandsList = Configuration.getInstance().getConfig('commandsList'),
            definitions = argumentsConfiguration.definitions,
            mainArguments = commandLineArgs(definitions, {stopAtFirstUnknown: true}),
            mainOptions = mainArguments._unknown || [],
            command = mainArguments.command;

        if(!commandsList.has(command)) {
            console.log(`'${command}' is not a valid command. Please check the commands list.`);
            command = this.getDefaultCommand(definitions);
        }

        return this.parseCommand(commandsList.get(command), mainOptions);
    }

    private getDefaultCommand(definitions: any): string {
        for(let definition of definitions) {
            if(definition.name === 'command') {
                return  definition.defaultValue ? definition.defaultValue : null;
            }
        }
        return '';
    }

    private parseCommand(configuration: any, commandArgumentsInput: any): string {
        Configuration.parseDefinitionsType(configuration.definitions);
        let {name, definitions, subCommands} = configuration,
            commandArguments = commandLineArgs(definitions ? definitions : [], {argv: commandArgumentsInput, stopAtFirstUnknown: true});

        if(Array.isArray(subCommands)) {
            let subCommandName = commandArguments.command,
                subCommandDefinitions = this.getSubCommandDefinitions(subCommandName, subCommands);
            commandArguments.subCommandOptions = commandLineArgs(subCommandDefinitions, {argv: commandArguments._unknown || []});
        }

        CommandFactory.getCommand(name).resolveArguments(commandArguments);

        return name;
    }

    private getSubCommandDefinitions(commandName: string, commandsList: Array<any>): Array<any> {
        for(let command of commandsList) {
            if(commandName === command.name) {
                let definitions = command.definitions;
                Configuration.parseDefinitionsType(definitions);
                return definitions;
            }
        }

        return [];
    }
}

export {ArgumentsParser};
