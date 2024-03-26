const { exec } = require("child_process");
const path = require('path');
const fs = require('fs');

async function runAll() {
    try {
        await runCommand("tsc --outDir ./dist/build/");
        await runCommand("ncp ./src/html dist/build/html"); //Copy over the html files
        //Copy over FFMPEG folder to dist/ts/bin/ (the folder doesn't exist so make it)
        const targetPath = "dist/build/bin";
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        await runCommand(`ncp bin/ ${targetPath}`); //Copy over ffmpeg + libs

        //Run tailwind cli to generate css
        await runCommand("npx tailwindcss-cli@latest build -i ./src/html/css/input.css -o ./dist/build/html/css/output.css");

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
