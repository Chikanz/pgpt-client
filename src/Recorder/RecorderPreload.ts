// In the preload script.
import { ipcRenderer } from 'electron';
import {fs} from 'fs';

async function getCameraStream() {
    try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (e) {
        console.error("Error getting camera stream: ", e);
        return null;
    }
}

let mediaRecorder;

ipcRenderer.on('app-quitting', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
});


ipcRenderer.on('SET_SOURCE', async (event, sourceId) => {
    try {
        const desktopStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                // @ts-ignore
                mandatory: {
                    chromeMediaSource: 'desktop'
                }
            },
            video: {
                // @ts-ignore
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId,
                    minWidth: 1280,
                    minHeight: 720,
                    maxWidth: 1920,
                    maxHeight: 1080
                }
            }
        });

        const cameraStream = await getCameraStream();

        if (cameraStream) {
            const audioTrack = cameraStream.getAudioTracks()[0];
            const combinedStream = new MediaStream([...desktopStream.getVideoTracks(), audioTrack]);

            handleStream(combinedStream);
        } else {
            handleStream(desktopStream);
        }
    } catch (e) {
        handleError(e);
    }
});

let chunks = [];
function handleStream(stream) {
    const video = document.querySelector('video');
    video.srcObject = stream;
    video.onloadedmetadata = (e) => video.play();

    // MediaRecorder to capture the stream
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

    // When data is available, push it to chunks
    mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
            chunks.push(event.data);
        }
    };

    // When recording is stopped, save chunks to a blob, and subsequently to a file
    mediaRecorder.onstop = () => {
        console.log("Saving file...");
        const blob = new Blob(chunks, { type: 'video/webm' });
        const filename = `recorded-${Date.now()}.webm`;
        const file = new File([blob], filename, { type: 'video/webm' });

        // You can use Electron's file system APIs here to save the file.
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                //Create the recording folder if it doesn't exist
                if (!fs.existsSync('recording')) fs.mkdirSync('recording');

                //@ts-ignore
                fs.writeFileSync(`recording/${filename}`, Buffer.from(new Uint8Array(reader.result)));
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Start recording
    mediaRecorder.start();

    // Stop recording after a certain time (e.g., 30 seconds)
    setTimeout(() => {
        mediaRecorder.stop();
    }, 5000);
}


function handleError(e) {
    console.log(e);
}
