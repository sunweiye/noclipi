import path from 'path';
import fs, {WriteStream} from 'fs';
import {readFile, utils, WorkBook, WorkSheet} from 'xlsx';
import {Command} from '../Command';
import {IllegalArgumentError} from "../../Error";

class XliffCommand implements Command{
    readonly name: string = 'xliff';

    private workbook: WorkBook;

    private target: string;

    private languageKeys: Array<string>;

    private writeToSingleFile: Boolean;

    private successItems: number = 0;

    private errorItems: number = 0;

    resolveArguments(args: any): void {
        let {source, target, languages} = args;

        if(!source) {
            this.throwInvalidArgumentError('sources');
        }
        if(!target) {
            this.throwInvalidArgumentError('target');
        }
        if(!languages) {
            this.throwInvalidArgumentError('languages');
        }

        try {
            this.workbook = readFile(path.resolve(source), {});
        } catch (e) {
            global.exitWithError(`${e.message}\nPlease check make sure a valid excel file is given to the source option.`);
        }

        this.target = target;

        this.writeToSingleFile = target.indexOf('?') < 0;

        this.languageKeys = languages.length ? languages : ['']
    }

    execute(): void {
        for(let sheetName of this.workbook.SheetNames) {
            let sheet: WorkSheet = (<any> this.workbook.Sheets)[sheetName];
            if(sheet !== undefined && sheet['!ref'] !== undefined) {

            }
        }


        // console.log(this);
        // this.sources.forEach((source) => {
        //
        //     // try {
        //     //     let workbook: WorkBook = readFile(source, {});
        //     //     console.log(`\nCreate the redirects from file ${source} ...`);
        //     //     for(let sheetName of workbook.SheetNames) {
        //     //         let sheet: WorkSheet = (<any> workbook.Sheets)[sheetName];
        //     //         if(sheet !== undefined && sheet['!ref'] !== undefined) {
        //     //             this.generateRedirectsInSheet(sheet, sheetName);
        //     //         }
        //     //     }
        //     // } catch (e) {
        //     //     console.log(`Error occurs by reading file ${source}:\n${e.message}`);
        //     // }
        // });
        // console.log(`Finish to write redirect configuration to file ${this.targetFile.path} with ${this.successItems} redirects. ${this.errorItems} failed.`);
    }

    private createTranslateUnitNode() {

    }

    private throwInvalidArgumentError(name: string) {
        throw new IllegalArgumentError(`The ${name} option is required.`);
    }
}

export {XliffCommand};