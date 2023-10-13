import { BrowserWindow, app, desktopCapturer } from "electron";
import path from 'path';

let RecordingWindow : BrowserWindow;

app.on('before-quit', () => {
    RecordingWindow.webContents.send('app-quitting');
});

export default function OpenRecordingSelector() {
    RecordingWindow = new BrowserWindow({
        width: 400,
        height: 500,
        // show: false,
        webPreferences: {
            // preload: path.join(__dirname, 'RecorderPreload.js'),
            nodeIntegration: true,
            contextIsolation: false, 
        }
    });

    RecordingWindow.webContents.openDevTools();

    RecordingWindow.loadFile(path.join(__dirname, '..', 'html', 'recorder.html')).catch(e => {
        console.error("Error loading file: ", e);
    });

    return RecordingWindow;
}
