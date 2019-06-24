declare module NodeJS  {
    interface Global {
        exitWithError: Function,
        isFileOfFormat: Function,
        getTypeConstructor: Function
    }
}

global.exitWithError = (error: Error | string, showStack: boolean = false) => {
    console.log(`An error occurs: \n${error instanceof Error ? error.message : error}`);
    if(showStack && error instanceof Error) {
        console.log(error.stack);
    }
    process.exit(1);
};

global.isFileOfFormat = (file: string, format: string | Function) : boolean => {
    let fileExtension = file.substr(file.lastIndexOf('.') + 1);
    if(format instanceof Function) {
        return format(fileExtension);
    }

    switch (format.toLowerCase()) {
        case 'yaml':
            return /(yaml|yml)$/ig.test(fileExtension);
        case 'excel':
            return /(xls|sxls)$/ig.test(fileExtension);
        default:
            return true;
    }
};

global.getTypeConstructor = (type: string | Function): Function => {
    if(type instanceof Function) {
        return type;
    }

    switch (type.toLowerCase()) {
        case 'boolean':
            return Boolean;
        case 'number':
            return Number;
        default:
            return String;
    }
};
