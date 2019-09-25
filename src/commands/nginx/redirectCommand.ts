import path from 'path';
import https from 'https';
import http from 'http';
import fs, {WriteStream} from 'fs';
import {URL} from "url";
import {readFile, utils, WorkBook, WorkSheet} from 'xlsx';
import {Command} from '../Command';
import {IllegalArgumentError} from "../../Error";

type Interval = {
    start: number,
    end: number
};

class RedirectCommand implements Command {
    readonly name: string = 'redirect';

    private checkMode: boolean = false;

    private sources: Array<string>;

    private targetFile: WriteStream;

    private urlConstructorParameters: Array<any> = [];

    private prefixes: Array<string> = [''];

    private ignoredLines: Set<Number> = new Set<Number>();

    private extraArguments: any = {};

    private successItems: number = 0;

    private errorItems: number = 0;

    resolveArguments(args: any): void {
        let {sources, target, prefixes, check} = args;

        this.checkMode = check;

        if (!sources || sources.length === 0) {
            this.throwInvalidArgumentError('sources');
        }
        if (!this.checkMode && !target) {
            this.throwInvalidArgumentError('target');
        }

        try {
            this.sources = sources.map((file: string) => path.resolve(file));
        } catch (e) {
            global.exitWithError(`${e.message}\nPlease check make sure valid excel files are given to the source option.`);
        }

        this.targetFile = this.checkMode ? null : fs.createWriteStream(path.resolve(target), {flags: 'a'});

        if (prefixes) {
            this.prefixes = prefixes.split(',').map((prefix: string) => {
                prefix = prefix.trim();
                return prefix.length ? '/' + prefix : '';
            });
        }

        if (args['ignore-lines']) {
            args['ignore-lines'].split(',').forEach((lineNumber: string) => {
                let line = parseInt(lineNumber);
                if (line > 0) {
                    this.ignoredLines.add(line);
                }
            });
        }

        if (args['base-url']) {
            this.urlConstructorParameters = [args['base-url']];
        }

        if (args['extra-args']) {
            let inputArgs:string = args['extra-args'].trim(),
                argumentsObj: any = {};
            if (inputArgs.length > 0) {
                try {
                    argumentsObj = JSON.parse(inputArgs);
                } catch (e) {
                    args['extra-args'].match(/\S+/g).forEach((argument:string) => {
                        let [key, value] = argument.split('=');
                        argumentsObj[key] = value;
                    });
                }

                if(argumentsObj.user && argumentsObj.password) {
                    argumentsObj.auth = Buffer.from(`${argumentsObj.user}:${argumentsObj.password}`).toString('base64');
                    delete argumentsObj['user'];
                    delete argumentsObj['password'];
                }
            }
            this.extraArguments = argumentsObj;
        }
    }

    execute(): void {
        this.executeAsync();
    }

    private async executeAsync() {
        for (let source of this.sources) {
            if (!this.checkMode) {
                this.targetFile.write('\n');        // Always start with a new line
            }

            try {
                let workbook: WorkBook = readFile(source, {});
                console.log(`\n${this.checkMode ? 'Check' : 'Create'} the redirects from file ${source} ...`);
                for (let sheetName of workbook.SheetNames) {
                    let sheet: WorkSheet = (<any>workbook.Sheets)[sheetName];
                    if (sheet !== undefined && sheet['!ref'] !== undefined) {
                        await this.executeTaskOverSheet(sheet, sheetName);
                    }
                }
            } catch (e) {
                console.log(`Error occurs by reading file ${source}:\n${e.message}`);
            }
        }
        console.log(this.checkMode ?
            `Finish to check the redirects: \x1b[32m${this.successItems} successfully redirected as excepted\x1b[0m, \x1b[31m${this.errorItems} failed\x1b[0m.` :
            `Finish to write redirect configuration to file ${this.targetFile.path}: \x1b[32m${this.successItems} records of redirects were added\x1b[0m, \x1b[31m${this.errorItems} failed\x1b[0m.`
        );
    }

    private async executeTaskOverSheet(sheet: WorkSheet, sheetName: string) {
        let range = utils.decode_range(sheet['!ref']),
            rows: Interval = {
                start: range.s.r,
                end: range.e.r
            },
            oldUrlColumn = range.s.c,
            newUrlColumn = range.e.c;

        for (let row = rows.start; row <= rows.end; row++) {
            if (this.ignoredLines.has(row + 1)) {
                continue;
            }
            try {
                await this.runRedirectTaskForUrl(
                    sheet[utils.encode_cell({c: oldUrlColumn, r: row})].v,
                    sheet[utils.encode_cell({c: newUrlColumn, r: row})].v
                );
                this.successItems++;
            } catch (e) {
                console.log(`Couldn't write the redirect because of an error occurs on row ${row + 1} in sheet ${sheetName}: ${e.message}`);
                this.errorItems++;
            }
        }
    }

    private async runRedirectTaskForUrl(theOld: string, theNew: string) {
        let theNewUrl = new URL(theNew.replace(/\u200B/g, ''), ...this.urlConstructorParameters),
            errors: Array<Error> = [],
            oldUrlsList = theOld.split(/[\n|\r]+/gm);

        for (let urlItem of oldUrlsList) {
            urlItem = urlItem.replace(/\u200B/g, '').trim();
            try {
                if (urlItem.length === 0) {
                    return;
                }
                let theOldUrl = new URL(urlItem, ...this.urlConstructorParameters),
                    urlConstructorParametersForTest = this.urlConstructorParameters.length > 0 ?
                        this.urlConstructorParameters :
                        [`${theOldUrl.protocol}//${theOldUrl.hostname}${theOldUrl.port.length ? ':' + theOldUrl.port : ''}`]
                for (let prefix of this.prefixes) {
                    if (this.checkMode) {
                        await this.checkRedirectUrl(
                            new URL(prefix + theOldUrl.pathname + theOldUrl.search, ...urlConstructorParametersForTest),
                            new URL(prefix + theNewUrl.pathname + theNewUrl.search, ...urlConstructorParametersForTest)
                        );
                    } else {
                        this.targetFile.write(`rewrite ^\\${prefix + theOldUrl.pathname.replace(/\./g, '\\.') + theOldUrl.search} ${prefix + theNewUrl.pathname + theNewUrl.search} permanent;\n`);
                    }
                }
            } catch (e) {
                errors.push(e);
            }
        }

        if (errors.length > 0) {
            throw new Error(
                errors.reduce((messsage: string, error: Error) => messsage + error.message + '\n', '')
            );
        }
    }

    private async checkRedirectUrl(oldUrl: URL, newUrl: URL) {
        let options: any = {
                host: oldUrl.hostname,
                path: oldUrl.pathname + oldUrl.search
            },
            response: http.IncomingMessage;

        if (oldUrl.port.length) {
            options.port = parseInt(oldUrl.port);
        }

        if(oldUrl.protocol === 'https:') {
            response = await this.handlerRequest({rejectUnauthorized: false, ...this.extraArguments, ...options}, true);
        } else {
            response = await this.handlerRequest({...this.extraArguments, ...options});
        }

        if (response.statusCode < 300 || response.statusCode >= 400 || response.headers.location !== newUrl.href) {
            console.log(`\x1b[31mThe requested URL ${oldUrl.href} was excepted to redirect to ${newUrl.href}, but the response has code ${response.statusCode} with location ${response.headers.location}\x1b[0m`);
            throw new Error(`Redirect check failed by request ${oldUrl.href}`);
        }
    }

    private async handlerRequest(options: any, isHttpsRequest: boolean = false): Promise<http.IncomingMessage> {
        let requestHandler = isHttpsRequest ? https : http;
        return new Promise<http.IncomingMessage>(resolve => requestHandler.get(options, response => resolve(response)));
    }

    private throwInvalidArgumentError(name: string) {
        throw new IllegalArgumentError(`The ${name} option is required.`);
    }
}

export {RedirectCommand};
