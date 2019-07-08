import {Command} from '../Command';
import {XliffCommand} from "./xliffCommand";
import {IllegalArgumentError} from "../../Error";
import {HelpCommand} from "../help";

class LocalizationCommand implements Command {
    readonly name: string = 'localization';

    private static subCommandsList = {
        xliff: XliffCommand
    };

    private static getSubCommandByName(commandName: string): Command {
        if((<any> LocalizationCommand.subCommandsList)[commandName]) {
            return new (<any> LocalizationCommand.subCommandsList)[commandName]();
        }

        throw new IllegalArgumentError(`Unknown command '${commandName}'.`);
    }

    private showHelp: boolean = true;

    private subCommand: Command = null;

    resolveArguments(args: any): void {
        this.showHelp = args.help;
        if(args.command) {
            try {
                this.subCommand = LocalizationCommand.getSubCommandByName(args.command);
                if(!this.showHelp) {
                    this.subCommand.resolveArguments(args.subCommandOptions);
                }
            } catch (e) {
                console.log(e.message);
                this.showHelp = true;
            }
        }
    }

    execute(): void {
        if(!this.subCommand) {
            new HelpCommand(this.name).execute();
        } else if(this.showHelp) {
            new HelpCommand(this.name).execute(this.subCommand.name);
        } else {
            this.subCommand.execute()
        }
    }
}

export {LocalizationCommand};
