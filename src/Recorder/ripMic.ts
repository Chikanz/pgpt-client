import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { resourcesPath, rootExePath } from '../paths';
import fs from 'fs';

const ffmpegPath = path.join(resourcesPath, 'bin/ffmpeg.exe');
const outPath = path.join(rootExePath, 'recording');

//Rip microphone track from the latest mp4 file
export default function ripMic(videoPath : string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg.setFfmpegPath(ffmpegPath);
    
        //Rip that shit
        ffmpeg(videoPath)
            .outputOptions(['-map 0:2', '-c:a libopus'])
            .output(path.join(outPath, 'mic.webm'))
            .on('end', () => {
                console.log('Done Ripping mic');
                resolve();
            })
            .on('error', (err) => {
                console.log('An error occurred: ' + err.message);
                reject(err);
            })
            .run();
    });
}