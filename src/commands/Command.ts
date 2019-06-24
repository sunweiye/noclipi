interface Command {
    readonly name: string;
    resolveArguments(args: any): void;
    execute(): void;
}

export {Command};
