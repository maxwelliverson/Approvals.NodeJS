import glob from "glob";

var path = require('path');

function unique<T>(items: T[]): T[] {
    return [...new Set(items)];
}


var normalizeFilePath = function (filePath) {
    return (filePath || '').replace(/\\/g, "/");
}

module.exports = function (config, approvedFilesMap) {

    var options = config;

    if (options.errorOnStaleApprovedFiles) {
        // Don't require glob at the top of the file.
        // this avoids a load of glob if it's not necessary
        var glob = require('glob');

        // normalize file paths for searching (windows vs *nix)...
        var normalizedApprovedFilePaths = approvedFilesMap.map(normalizeFilePath);

        var getAllDirectoriesOfApprovedFiles = unique(normalizedApprovedFilePaths.map(function (file) { return path.dirname(file); })) // get just the directory of each

        var discoveredApprovalFiles: any = [];
        getAllDirectoriesOfApprovedFiles.forEach(function (folder) {
            return glob.sync(folder + "**/*.approved.*").forEach(function (file) {
                if (discoveredApprovalFiles.indexOf(file) === -1) {
                    discoveredApprovalFiles.push(file);
                }
            });
        }); // use 'glob' to find all .approved.* files for each folder.

        discoveredApprovalFiles = discoveredApprovalFiles.map(normalizeFilePath);

        var staleApprovals = discoveredApprovalFiles.filter(function (file) {
            if (typeof options.shouldIgnoreStaleApprovedFile === "function") {
                return !options.shouldIgnoreStaleApprovedFile(file);
            }
            return true;
        }).filter(function (discoveredFilePath) {
            return normalizedApprovedFilePaths.indexOf(discoveredFilePath) < 0;
        }); // only pull the ones that aren't already in the 'normalizedApprovedFilePaths'

        if (staleApprovals.length) {
            throw new Error('ERROR: Found stale approvals files: \n  - ' + staleApprovals.join('\n  - ') + '\n');
        }
    }

};

