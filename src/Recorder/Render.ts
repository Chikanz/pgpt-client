import { ipcRenderer } from 'electron';
import { writeFile, existsSync, mkdirSync } from 'fs';
import path from 'path';

let mediaRecorder: MediaRecorder;
let recordedChunks = [];

const videoElement = document.querySelector('video');

//Start recording on document load
document.addEventListener('DOMContentLoaded', async () => {
    await startRecording();
});

async function startRecording() {
    const inputSources: Electron.DesktopCapturerSource[] = await ipcRenderer.invoke('getSources')

    //Get input where name is Screen 1
    const screenSource = inputSources.find(source => source.name === 'Screen 1')
    const screenId = screenSource.id;

    const constraints = {
        cursor: 'never',
        
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

    // Create a Stream
    //@ts-ignore
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Preview the source in a video element
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
    recordedChunks.push(e.data);
}

async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'recording') {
        console.log("not recording m8");
        return;
    }

    mediaRecorder.stop();

    console.log("Stopping recording");
    videoElement.srcObject = null

    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    recordedChunks = [];

    const recordingPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR! || __dirname, "/recordings/recording.webm");
    //Make recording path if it doesn't exist
    const recordingDir = path.dirname(recordingPath);
    if (!existsSync(recordingDir)) {
        mkdirSync(recordingDir, { recursive: true });
    }

    writeFile(recordingPath, buffer, (err) => {
        if (err) {
            console.error('Failed to save video ', err);
        } else {
            console.log('video saved successfully!');
        }
    });

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

