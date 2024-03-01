import { app } from "electron";
import path from 'path';
import fs from 'fs';
import {exec} from 'child_process';

export default function LaunchGame(gamePath: string | null) {

    const exePath = app.getPath('exe');
    const gameFolder = app.isPackaged
        ? path.join(process.env.PORTABLE_EXECUTABLE_DIR! || exePath, "game")
        : path.join(__dirname, "game");

    console.log(gameFolder);

    if (!gamePath) {
        const files = fs.readdirSync(gameFolder);
        for (const file of files) {
          if (file.endsWith(".exe")) {
            gamePath = file;
            console.log(file);
            break;
          }
        }
    }

    const fullGamePath = path.join(gameFolder, gamePath);
    console.log(fullGamePath);

    const gameProcess = exec(fullGamePath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing .exe: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    return gameProcess;
}