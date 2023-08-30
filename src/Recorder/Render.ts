import { ipcRenderer } from 'electron';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';

let mediaRecorder: MediaRecorder;
let videoElement = document.querySelector('video');

const recordingPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR! || __dirname, "/recordings/recording.webm");
const recordingDir = path.dirname(recordingPath);

if (!existsSync(recordingDir)) {
    mkdirSync(recordingDir, { recursive: true });
}

const writable = createWriteStream(recordingPath);

// Start recording on document load
document.addEventListener('DOMContentLoaded', async () => {
    await startRecording();
});

async function startRecording() {
    const inputSources: Electron.DesktopCapturerSource[] = await ipcRenderer.invoke('getSources');

    //Get input where name is Screen 1
    const screenSource = inputSources.find(source => source.name === 'Screen 1');
    const screenId = screenSource.id;

    const constraints = {
        audio: {
            mandatory: {
                chromeMediaSource: 'desktop'
            }
        },
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenId
            }
        }
    };

    //@ts-ignore
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    videoElement.srcObject = stream;
    await videoElement.play();

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9', bitsPerSecond: 5000000 });
    mediaRecorder.ondataavailable = onDataAvailable;
    mediaRecorder.onstop = stopRecording;
    mediaRecorder.start(100);
    console.log(mediaRecorder.state);
}

function onDataAvailable(e) {
    console.log('Pushing chunky');
    const blob = e.data;
    blob.arrayBuffer().then((arrayBuffer) => {
        writable.write(Buffer.from(arrayBuffer));
    });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'recording') {
        console.log("not recording m8");
        return;
    }

    mediaRecorder.stop();
    console.log("Stopping recording");
    videoElement.srcObject = null;
    writable.end();
}

ipcRenderer.on('stop-recording', () => {
    stopRecording();
});

ipcRenderer.on('app-quitting', () => {
    stopRecording();
});

window.addEventListener('beforeunload', () => {
    stopRecording();
});
