import fs from 'fs';
import path from 'path';

const yaml: any = require('js-yaml');

class Configuration {
    public static readonly APP_CONFIG_FILE_PATH = path.resolve('./resources/configs/application.yml');
    public static readonly COMMAND_CONFIG_DIR_PATH = path.resolve('./resources/configs/commands');

    private static instance: Configuration;

    private configs: Map<string, any> = new Map<string, any>();

    public static getInstance(): Configuration {
        if (!Configuration.instance) {
            Configuration.instance = new Configuration();
        }
        return Configuration.instance;
    }

    public static parseDefinitionsType(definitions: Array<any>): void {
        for (let definition of definitions) {
            if (definition.type) {
                definition.type = global.getTypeConstructor(definition.type);
            }
        }
    }

    private constructor() {
        try {
            let applicationBaseConfiguration = yaml.safeLoad(fs.readFileSync(Configuration.APP_CONFIG_FILE_PATH, 'utf8')),
                applicationArguments = applicationBaseConfiguration.application.arguments;

            Configuration.parseDefinitionsType(applicationArguments.definitions);
            this.configs.set('arguments', applicationArguments);
            this.configs.set('applicationUsage', applicationBaseConfiguration.application.usageContents);
            this.loadCommandsConfiguration();
        } catch (e) {
            global.exitWithError(e);
        }
    }

    private loadCommandsConfiguration(): void {
        let commandsList: Map<string, object> = new Map<string, object>();
        fs.readdirSync(Configuration.COMMAND_CONFIG_DIR_PATH).map((file: string) => {
            if (global.isFileOfFormat(file, 'yaml')) {
                let commandConfiguration = yaml.safeLoad(fs.readFileSync(Configuration.COMMAND_CONFIG_DIR_PATH + '/' + file, 'utf8'));
                commandsList.set(commandConfiguration.command.name, commandConfiguration.command);
            }
        });
        this.configs.set('commandsList', commandsList);
    }

    public getConfig(name: string): any {
        return this.configs.get(name);
    }

    public getResolvedCommandConfiguration(commandName: string): any {
        let commandConfiguration = this.configs.get('commandsList').get(commandName);
        if(commandConfiguration.definitions) {
            Configuration.parseDefinitionsType(commandConfiguration.definitions);
        } else {
            commandConfiguration.definitions = [];
        }

        if(commandConfiguration.subCommands && commandConfiguration.subCommands.hasOwnProperty('includes')) {
            // TODO: Support the configuration of dir
            let {files, dir} = commandConfiguration.subCommands.includes;
            if(files) {
                if(typeof files === 'string') {
                    files = [files];
                }
                if(!Array.isArray(files)) {
                    global.exitWithError(`The configuration for the included files in the 'subCommands' of command '${commandName}' must be a path or an array of paths `);
                }
            }

            commandConfiguration.subCommands = files.map((file: string) => {
                if (!global.isFileOfFormat(file, 'yaml')) {
                    global.exitWithError(`The value '${file}' for the file in 'subCommands' of command '${commandName}' is not a yaml file`);
                }

                try {
                    return yaml.safeLoad(fs.readFileSync(Configuration.COMMAND_CONFIG_DIR_PATH + '/' + file, 'utf8')).command;
                } catch (e) {
                    global.exitWithError(e);
                }
            });
        }
        return commandConfiguration;
    }

    public getUsageContentsForCommands(commandName: string = ''): Array<object> {
        let command = this.configs.get('commandsList').get(commandName);
        if (command) {
            return command.subCommands.map((subCommand: any) => {
                    return {
                        name: subCommand.name,
                        summary: subCommand.description
                    }
                }
            );
        } else {
            return Array.from(this.configs.get('commandsList').entries()).sort().map(
                (command: any) => {
                    return {
                        name: command[1].name,
                        summary: command[1].description
                    }
                }
            );
        }
    }

    public getCommandDefinitions(commandName: string = '', commandSettings: any = null): Array<object> {
        let command = commandSettings ? commandSettings : this.configs.get('commandsList').get(commandName);
        if (command) {
            let definitions = [];
            for(let definition of command.definitions) {
                if(!definition.hideInHelp) {
                    definitions.push(definition);
                }
            }
            return definitions;
        } else {
            //TODO: Application definitions
            return [{}];
        }
    }
}

export {Configuration};
