import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as autils from '../AUtils';
import reportingLaunchingCircuitBreaker from './ReportLaunchingCircuitBreaker';

interface CmdOptions {
    blockUntilReporterExits?: boolean;
    cmdOptionOverrides?: any;
    cmdArgs?: string[];
}

class GenericDiffReporterBase {
    name: string;
    exePath?: string;
    private _reporterFileLookedUp: boolean;
    private _reporterFileLookedUpAndFound: boolean;

    constructor(name: string) {
        if (!name) {
            throw new Error("Argument name missing");
        }

        this.name = name;
        this._reporterFileLookedUp = false;
        this._reporterFileLookedUpAndFound = false;
    }

    isReporterAvailable(): boolean {
        if (this._reporterFileLookedUp) {
            return this._reporterFileLookedUpAndFound;
        }

        this._reporterFileLookedUp = true;

        if (!fs.existsSync(this.exePath!)) {
            return false;
        }
        this._reporterFileLookedUpAndFound = true;
        return true;
    }

    canImageDiff(): boolean {
        return false;
    }

    canReportOn(fileName: string): boolean {
        if (!this.isReporterAvailable()) {
            return false;
        }

        autils.assertFileExists(fileName);

        if (this.canImageDiff()) {
            return true;
        }

        const isBinary = autils.isBinaryFile(fileName);
        return !isBinary;
    }

    spawn(exe: string, args: string[], cmdOptions?: any): void {
        const process = childProcess.spawn(exe, args, cmdOptions);

        let stdout = '';
        let stderr = '';

        process.stdout.on("data", (data) => {
            stdout += data;
        });
        process.stderr.on("data", (data) => {
            stderr += data;
        });

        process.on("close", () => {
            if (stdout) {
                console.log('\n============\nstdout:\n============\n' + stdout + "\n============\n");
            }
            if (stderr) {
                console.log('\n============\nstderr:\n============\n' + stderr + "\n============\n");
            }
        });
    }

    spawnSync(exe: string, args: string[], cmdOptions?: any): void {
        const result = childProcess.spawnSync(exe, args, cmdOptions);

        const stdout = result.stdout.toString();
        const stderr = result.stderr.toString();

        if (stdout) {
            console.log('\n============\nstdout:\n============\n' + stdout + "\n============\n");
        }
        if (stderr) {
            console.log('\n============\nstderr:\n============\n' + stderr + "\n============\n");
        }
    }

    report(approved: string, received: string, options: CmdOptions): void {
        if (!options.blockUntilReporterExits) {
            if (reportingLaunchingCircuitBreaker.check(approved, received, options)) {
                return;
            }
        }

        const spawnMethod = options.blockUntilReporterExits ? this.spawnSync.bind(this) : this.spawn.bind(this);
        autils.createEmptyFileIfNotExists(approved);

        const exe = this.exePath!;
        const cmdOptions = options.cmdOptionOverrides;
        const args = options.cmdArgs || [received, approved];

        console.log('CMD: ', exe, args.join(' '));

        spawnMethod(exe, args, cmdOptions);
    }
}

export = GenericDiffReporterBase;
