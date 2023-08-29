import { app } from "electron";
import path from 'path';
const { BrowserWindow, desktopCapturer } = require('electron');

const { exec } = require('child_process');

export default function LaunchGame(gamePath: string) {

    //Launch the game
    const fullGamePath = app.isPackaged
        ? path.join(process.env.PORTABLE_EXECUTABLE_DIR!, "game", gamePath)
        : path.join(__dirname, "game", gamePath);

    exec(fullGamePath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing .exe: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
}