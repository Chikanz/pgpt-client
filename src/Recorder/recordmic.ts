//Not used anymore in favour of track splitting

import ffmpeg from 'fluent-ffmpeg';
import { app } from 'electron';
import path from 'path';
import { resourcesPath, rootExePath } from '../paths';

let command: ffmpeg.FfmpegCommand;

const ffmpegPath = path.join(resourcesPath, 'bin/ffmpeg.exe');
const recPath = path.join(rootExePath, 'recording/mic.webm');

// Start recording the mic to a seperate file
function start(micname: string) {
    console.log(`recording mic to ${recPath}`);

    ffmpeg.setFfmpegPath(ffmpegPath);

    command = ffmpeg()
        .input(`audio=Microphone (${micname})`)
        .inputFormat('dshow')
        .audioCodec('libopus')
        .save(recPath)
        .on('end', () => {
            console.log('Mic Recording finished OK!');
        })
        .on('error', (err) => {
            console.log(`FFMPEG error occurred: ${err.message}`);
        })
}

function stop() {
    //send q to stdin
    //@ts-ignore
    command.ffmpegProc.stdin.write('q');
}

export default { start, stop }