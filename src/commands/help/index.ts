import {Command} from '../Command';
import {Configuration} from '../../Configuration';

const commandLineUsage: any = require('command-line-usage');

class HelpCommand implements Command {
    readonly name: string = 'help';

    private helpOfCommand: string;

    private readonly configuration: Configuration;

    public constructor(command: string = '') {
        this.helpOfCommand = command;
        this.configuration = Configuration.getInstance();
    }

    resolveArguments(args: any): void {
        if (args.command) {
            this.helpOfCommand = args.command;
        }
    }

    execute(subCommandName: string | null = null): void {
        let usageContents,
            command = null;
        if(this.helpOfCommand) {
            command = this.getHelpOfCommand(subCommandName);
            usageContents = command.usageContents;

            let definitions = command.definitions;
            Configuration.parseDefinitionsType(definitions);
        } else {
            usageContents = this.configuration.getConfig('applicationUsage');
        }

        this.printUsageContent(usageContents, command);
    }

    private printUsageContent(usageContents: Array<any>, command: any = null): void {
        for (let usage of usageContents) {
            if (usage.contentGernerator && typeof usage.contentGernerator === 'string') {
                this.configuration.getResolvedCommandConfiguration(this.helpOfCommand);
                usage.content = (<any> this.configuration)['get' + usage.contentGernerator](this.helpOfCommand);
                delete usage.contentGernerator;
            }
            if (usage.optionsListGenerator && typeof usage.optionsListGenerator === 'string') {
                usage.optionList = (<any> this.configuration)['get' + usage.optionsListGenerator](this.helpOfCommand, command);
                delete usage.optionsListGenerator;
            }
        }
        console.log(commandLineUsage([...usageContents]));
    }

    private getHelpOfCommand(subCommandName: string | null = null): any {
        let command = this.configuration.getConfig('commandsList').get(this.helpOfCommand);
        if(subCommandName) {
            for(let subCommand of command.subCommands) {
                if(subCommand.name === subCommandName) {
                    return subCommand;
                }
            }

            console.log(`Couldn't find the sub command '${subCommandName}' of command '${this.helpOfCommand}'.`);
        }
        return command;
    }
}

export {HelpCommand};
