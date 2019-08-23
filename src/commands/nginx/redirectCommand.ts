import path from 'path';
import fs, {WriteStream} from 'fs';
import {URL} from "url";
import {readFile, utils, WorkBook, WorkSheet} from 'xlsx';
import {Command} from '../Command';
import {IllegalArgumentError} from "../../Error";

type Interval = {
    start: number,
    end: number
};

class RedirectCommand implements Command{
    readonly name: string = 'redirect';

    private sources: Array<string>;

    private targetFile: WriteStream;

    private urlConstructorParameters: Array<any> = [];

    private prefixes: Array<string> = [''];

    private successItems: number = 0;

    private errorItems: number = 0;

    resolveArguments(args: any): void {
        let {sources, target, prefixes} = args;

        if(!sources || sources.length === 0) {
            this.throwInvalidArgumentError('sources');
        }
        if(!target) {
            this.throwInvalidArgumentError('target');
        }

        try {
            this.sources = sources.map((file: string) => path.resolve(file));
        } catch (e) {
            global.exitWithError(`${e.message}\nPlease check make sure valid excel files are given to the source option.`);
        }

        this.targetFile = fs.createWriteStream(path.resolve(target), {flags: 'a'});

        if(prefixes) {
            this.prefixes = prefixes.split(',').map((prefix: string) => {
                prefix = prefix.trim();
                return prefix.length ? '/' + prefix : '';
            });
        }

        if(args['base-url']) {
            this.urlConstructorParameters = [args['base-url']];
        }
    }

    execute(): void {
        this.sources.forEach((source) => {
            this.targetFile.write('\n');        // Always start with a new line

            try {
                let workbook: WorkBook = readFile(source, {});
                console.log(`\nCreate the redirects from file ${source} ...`);
                for(let sheetName of workbook.SheetNames) {
                    let sheet: WorkSheet = (<any> workbook.Sheets)[sheetName];
                    if(sheet !== undefined && sheet['!ref'] !== undefined) {
                        this.generateRedirectsInSheet(sheet, sheetName);
                    }
                }
            } catch (e) {
                console.log(`Error occurs by reading file ${source}:\n${e.message}`);
            }  
        });
        console.log(`Finish to write redirect configuration to file ${this.targetFile.path} with ${this.successItems} redirects. ${this.errorItems} failed.`);
    }

    private generateRedirectsInSheet(sheet: WorkSheet, sheetName: string): void {
        let range = utils.decode_range(sheet['!ref']),
            rows: Interval = {
                start: range.s.r,
                end: range.e.r
            },
            oldUrlColumn = range.s.c,
            newUrlColumn = range.e.c;

        for (let row = rows.start; row <= rows.end; row++) {
            try {
                this.buildRedirectForUrl(
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

    private buildRedirectForUrl(theOld: string, theNew: string): void {
        let theOldUrl = new URL(theOld.replace(/\u200B/g,''), ...this.urlConstructorParameters),
            theNewUrl = new URL(theNew.replace(/\u200B/g,''), ...this.urlConstructorParameters);

        for(let prefix of this.prefixes) {
            this.targetFile.write(`rewrite ^\\${prefix + theOldUrl.pathname.replace(/\./g, '\\.') + theOldUrl.search} ${prefix + theNewUrl.pathname + theNewUrl.search} permanent;\n`);
        }
    }

    private throwInvalidArgumentError(name: string) {
        throw new IllegalArgumentError(`The ${name} option is required.`);
    }
}

export {RedirectCommand};
