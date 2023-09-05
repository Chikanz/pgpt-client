import { ipcRenderer } from 'electron';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { writeFile } from 'original-fs';
import path from 'path';

let mediaRecorder: MediaRecorder;
let videoElement = document.querySelector('video');

const recordingPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR! || __dirname, "/recordings/recording.webm");
const recordingDir = path.dirname(recordingPath);

let audioMediaRecorder: MediaRecorder;
const audioRecordingPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR! || __dirname, "/recordings/microphone.webm");
const audioWritable = createWriteStream(audioRecordingPath);

if (!existsSync(recordingDir)) {
    mkdirSync(recordingDir, { recursive: true });
}

const writable = createWriteStream(recordingPath);

// Start recording on document load
document.addEventListener('DOMContentLoaded', async () => {
    await startRecording();
});

async function startRecording() {
    // videoElement.srcObject = stream;
    // await videoElement.play();

    const stream = await GetScreenStream();

    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=avc1", videoBitsPerSecond: 5000000 });
    mediaRecorder.ondataavailable = onDataAvailable;
    mediaRecorder.onstop = stopRecording;
    mediaRecorder.start(2000);

    const audioStream = await getMicStream();
    audioMediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
    audioMediaRecorder.ondataavailable = onAudioDataAvailable;
    audioMediaRecorder.start();
}

async function listAudioDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
}

async function getMicStream() {
    const devices = await listAudioDevices();
    const mic = devices.filter(d => d.label.includes("Microphone (Blue Snowball)"));
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: mic[0].deviceId } });
    return stream;
}

async function getWebcamStream() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    return stream;
}


async function GetScreenStream() {
    const inputSources: Electron.DesktopCapturerSource[] = await ipcRenderer.invoke('getSources');

    //Get input where name is Screen 1
    console.log(inputSources);
    const screenSource = inputSources.find(source => source.name === 'Screen 1' || source.name === 'Entire screen');
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
                chromeMediaSourceId: screenId,
                frameRate: { ideal: 50, min: 30 },
                minWidth: 1280,
                minHeight: 720,
                maxWidth: 1920,
                maxHeight: 1080,
            }
        },
    };

    //@ts-ignore
    return await navigator.mediaDevices.getUserMedia(constraints);
}

// let chunks: Blob[] = [];
async function onDataAvailable(e) {
    console.log('Pushing chunky');
    const blob = e.data;
    // chunks.push(blob);
    const AB = await blob.arrayBuffer();
    writable.write(Buffer.from(AB));
}

async function onAudioDataAvailable(e) {
    console.log('Audio chunk in');
    const audioBlob = e.data;
    const audioAB = await audioBlob.arrayBuffer();
    audioWritable.write(Buffer.from(audioAB));
}

async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'recording') {
        console.log("not recording m8");
        return;
    }

    audioMediaRecorder.stop();
    audioWritable.end();

    //Write the chunks to the file
    // const blob = new Blob(chunks, {
    //     type: 'video/webm; codecs=avc1'
    //   });
    // const buffer = Buffer.from(await blob.arrayBuffer());
    // writeFile(recordingPath, buffer, () => console.log('video saved successfully!'));

    mediaRecorder.stop();
    writable.end();
    console.log("Stopped recording");
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
