import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { resourcesPath, rootExePath } from '../paths';
import { calculateSegmentDuration } from './util';
import { exec } from 'child_process';

const ffmpegPath = path.join(resourcesPath, 'bin', 'ffmpeg.exe');
const outPath = path.join(rootExePath, 'recording');

//Rip microphone track from the latest mp4 file
// export default function ripMic(videoPath : string, channel : number): Promise<void> {
//     console.log("Ripping mic...");
//     return new Promise((resolve, reject) => {
//         ffmpeg.setFfmpegPath(ffmpegPath);

//         //Rip that shit
//         ffmpeg(videoPath)
//             .outputOptions([`-map 0:${channel}`, '-c:a libopus']) //Rip mic on channel 2 (change 2 to 1 when uploading local files)
//             .output(path.join(outPath, 'mic.webm'))
//             .on('end', () => {
//                 console.log('Done Ripping mic!');
//                 resolve();
//             })
//             .on('error', (err) => {
//                 console.log('FFMPEG fukcy wucky: ' + err.message);
//                 reject(err);
//             })
//             .run();
//     });
// }

// Rip microphone track from the latest mp4 file into segments
// export default function ripMic(videoPath: string, channel: number): Promise<void> {
//     console.log("Ripping mic into segments...");
//     return new Promise((resolve, reject) => {
//         ffmpeg.setFfmpegPath(ffmpegPath);

//         const bitrate = 128; // Set audio bitrate in kbps
//         const segDur = calculateSegmentDuration(24, bitrate); // Calculate segment duration

//         //output the full command for debugging
//         console.log(`${ffmpegPath} -i "${videoPath}" -map 0:${channel} -c:a libopus -b:a ${bitrate}k -f segment -segment_time ${segDur} "${path.join(outPath, 'mic_%03d.webm')}"`);

//         // Rip and segment the mic track
//         ffmpeg(videoPath)
//             .outputOptions([
//                 `-map 0:${channel}`,
//                 '-c:a libopus',
//                 `-b:a ${bitrate}k`, // Set audio bitrate
//                 // '-f segment',
//                 // `-segment_time ${segDur}`, // Set segment duration
//             ])
//             .addOutputOption("-f", "segment", "-segment_time", "60")
//             .on('end', () => {
//                 console.log('Done Ripping mic!');
//                 resolve();
//             })
//             .on('error', (err) => {
//                 console.log('FFMPEG encountered an error: ' + err.message);
//                 reject(err);
//             })
//             .on('start', function (commandLine) {
//                 console.log('Spawned Ffmpeg with command: ' + commandLine);
//             })
//             .on('stderr', function(stderrLine) {
//                 console.log('Stderr output: ' + stderrLine);
//               })
//             .output(path.join(outPath, 'mic_%03d.webm')) // Output segmented files
//             .run()
//     });
// }

export default function ripMic(videoPath: string, channel: number): Promise<void> {
    console.log("Ripping mic into segments...");

    return new Promise((resolve, reject) => {
        const bitrate = 128; // Set audio bitrate in kbps
        const segDur = calculateSegmentDuration(); // Calculate segment duration

        // Construct the FFmpeg command
        const ffmpegCommand = `${ffmpegPath} -i "${videoPath}" -map 0:${channel} -c:a libopus -b:a ${bitrate}k -f segment -segment_time ${segDur} -reset_timestamps 1 "${path.join(outPath, 'mic_%03d.webm')}"`;

        // Output the full command for debugging
        console.log(`Running command: ${ffmpegCommand}`);

        // Execute the FFmpeg command
        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                console.log(`FFMPEG encountered an error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.log(`FFMPEG stderr: ${stderr}`);
            }
            console.log('FFMPEG stdout:', stdout);
            console.log('Done Ripping mic!');
            resolve();
        });
    });
}
