const { exec } = require("child_process");
const path = require('path');
const fs = require('fs');

async function runAll() {
    try {
        await runCommand("tsc");
        await runCommand("ncp src/html dist/ts/html"); //Copy over the html files
        //Copy over FFMPEG to dist/ts/bin/ (the folder doesn't exist so make it)
        const targetPath = "dist/ts/bin/ffmpeg.exe";
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync("bin/ffmpeg.exe", targetPath);

    } catch (error) {
        console.error(`Failed to run all commands: ${error}`);
    }
}
  

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error}`);
                reject(error);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
            resolve();
        });
    });
}

runAll();
