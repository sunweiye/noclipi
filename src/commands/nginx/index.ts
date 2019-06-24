import {Command} from '../Command';
import {HelpCommand} from "../help";
import {RedirectCommand} from "./redirectCommand";
import {IllegalArgumentError} from "../../Error";

class NginxCommand implements Command {
    readonly name: string = 'nginx';

    private static subCommandsList = {
        redirect: RedirectCommand
    };

    private static getSubCommandByName(commandName: string): Command {
        if((<any> NginxCommand.subCommandsList)[commandName]) {
            return new (<any> NginxCommand.subCommandsList)[commandName]();
        }

        throw new IllegalArgumentError(`Unknown command '${commandName}'.`);
    }

    private showHelp: boolean = true;

    private subCommand: Command = null;

    resolveArguments(args: any): void {
        this.showHelp = args.help;
        if(args.command) {
            try {
                this.subCommand = NginxCommand.getSubCommandByName(args.command);
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
            new HelpCommand('nginx').execute();
        } else if(this.showHelp) {
            new HelpCommand('nginx').execute(this.subCommand.name);
        } else {
            this.subCommand.execute()
        }
    }
}

export {NginxCommand};
