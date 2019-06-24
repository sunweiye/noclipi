noclipi - A node CLI framework for some commands
================

This framework is designed as a CLI framework and can be easily extended to run different jobs as a command.

## Run the framework with command
    
    ts-node src/index.ts <command> <subcommand> <options>

## The built-in commands
#### `help`
This command will print the help information of the framework and the given command. 

To use it:

    ts-node src/index.ts help [-c|--command] <command>
    
If no command is specified after `help`, the help information and supported commands list will be shown. Otherwise, it will
print the help information of the given command. And the option `-c` or `--command` can be omitted , e.x.

    ts-node src/index.ts help nginx

will show the help information of `nginx` command.

#### `nginx`
The `nginx` command is used to for the automation jobs with nginx. Use

    ts-node src/index.ts nginx -h

to show the help of the this command and use

    ts-node src/index.ts nginx -h <subcommand>
    
to show the help information of the given subcommand.

#### Sub Commands
##### `reirect`
This command will create the redirects of nginx by given excel file.

    ts-node src/index.ts nginx redirect <options>

## Add new Job/Command
