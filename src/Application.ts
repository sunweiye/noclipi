import {Command} from './commands/Command';
import {CommandFactory} from './commands/';
import {ArgumentsParser} from './arguments/ArgumentsParser'
import './Global';

class Application {
    private static instance: Application;

    private command: Command;

    public static getInstance(): Application {
        if(!Application.instance) {
            Application.instance = new Application();
        }

        return Application.instance;
    }

    private constructor() {
        this.command = CommandFactory.getCommand(ArgumentsParser.getInstance().parse());
    }

    public run() {
        this.command.execute();
    }
}

export {Application};
