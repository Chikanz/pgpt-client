import { app } from "electron";
import path from 'path';
import fs from 'fs';
import {exec} from 'child_process';

export function LaunchGame(fullGamePath: string) {
    console.log("Running:" + fullGamePath);

    const gameProcess = exec(`"${fullGamePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing .exe: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    return gameProcess;
}

//Takes in a gamepath from config
export function GetGamePath(exeName: string | null){
    const exePath = app.getPath('exe');
    const gameFolder = app.isPackaged
        ? path.join(process.env.PORTABLE_EXECUTABLE_DIR! || exePath, "game")
        : path.join(__dirname, "game");

    console.log("Game Folder:" + gameFolder);

    if (!exeName) {
        const files = fs.readdirSync(gameFolder);
        for (const file of files) {
          if (file.endsWith(".exe")) {
            exeName = file;
            console.log(file);
            break;
          }
        }
    }

    const fullGamePath = path.join(gameFolder, exeName);
    return {fullGamePath, exeName};
}
