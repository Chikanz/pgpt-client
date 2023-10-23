import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { resourcesPath, rootExePath } from '../paths';
import fs from 'fs';

const ffmpegPath = path.join(resourcesPath, 'bin/ffmpeg.exe');
const outPath = path.join(rootExePath, 'recording');

//Rip microphone track from the latest mp4 file
export default function ripMic(): Promise<void> {
    return new Promise(ffmpegPromise);
}

export function ffmpegPromise(resolve, reject) {
    ffmpeg.setFfmpegPath(ffmpegPath);

    //Find the latest mp4 file in the recording folder
    const files = fs.readdirSync(outPath);
    const mp4Files = files.filter(file => file.endsWith('.mp4'));
    const latestFile = mp4Files.sort()[0];
    const inputPath = path.join(outPath, latestFile);

    //Rip that shit
    ffmpeg(inputPath)
        .outputOptions(['-map 0:2', '-c:a libopus'])
        .output(path.join(outPath, 'mic.webm'))
        .on('end', () => {
            console.log('Conversion done');
            resolve();
        })
        .on('error', (err) => {
            console.log('An error occurred: ' + err.message);
            reject(err);
        })
        .run();
}