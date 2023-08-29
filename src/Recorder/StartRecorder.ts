import { BrowserWindow, app, desktopCapturer } from "electron";
import path from 'path';

let RecordingWindow : BrowserWindow;

app.on('before-quit', () => {
    RecordingWindow.webContents.send('app-quitting');
});

export default function StartRecording() {
    RecordingWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
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

    desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
        for (const source of sources) {
            if (source.name === 'Screen 1') {
                RecordingWindow.webContents.send('SET_SOURCE', source.id);
                return;
            }
        }
    }).catch(e => {
        console.error("Error in desktopCapturer: ", e);
    });
}
