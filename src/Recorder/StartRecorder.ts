import { BrowserWindow, app } from "electron";
import path from 'path';

let RecordingWindow : BrowserWindow;

app.on('before-quit', () => {
    RecordingWindow.webContents.send('app-quitting');
});

export default function OpenInputSelector() {
    RecordingWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        frame: false,
        fullscreen: true,
        webPreferences: {
            // preload: path.join(__dirname, 'RecorderPreload.js'),
            nodeIntegration: true,
            contextIsolation: false, 
        }
    });

    RecordingWindow.loadFile(path.join(__dirname, '..', 'html', 'recorder.html')).catch(e => {
        console.error("Error loading file: ", e);
    });

    return RecordingWindow;
}
