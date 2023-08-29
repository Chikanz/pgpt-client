import { ipcRenderer } from 'electron';
import { writeFile } from 'fs';
import path from 'path';

let mediaRecorder;
let recordedChunks = [];

const videoElement = document.querySelector('video');

//Start recording on document load
document.addEventListener('DOMContentLoaded', () => {
    startRecording();

    //Stop after 2 secs
    setTimeout(() => {
        stopRecording();
    }, 2000);
});

async function startRecording() {
    const inputSources: Electron.DesktopCapturerSource[] = await ipcRenderer.invoke('getSources')

    //Get input where name is Screen 1
    const screenSource = inputSources.find(source => source.name === 'Screen 1')
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

    // Create a Stream
    //@ts-ignore
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Preview the source in a video element
    videoElement.srcObject = stream;
    await videoElement.play();

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    mediaRecorder.ondataavailable = onDataAvailable;
    mediaRecorder.onstop = stopRecording;
    mediaRecorder.start();
}

function onDataAvailable(e) {
    recordedChunks.push(e.data);
}



async function stopRecording() {
    videoElement.srcObject = null

    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    recordedChunks = []

    const recordingPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR! || __dirname, "/recordings/recording.webm");
    console.log(recordingPath);
    writeFile(recordingPath, buffer, () => console.log('video saved successfully!'));
}

ipcRenderer.on('app-quitting', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
});