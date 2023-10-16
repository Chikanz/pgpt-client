import ffmpeg from 'fluent-ffmpeg';
import { app } from 'electron';
import path from 'path';

let command: ffmpeg.FfmpegCommand;
const ffmpegPath = path.join(app.getAppPath(), 'bin/ffmpeg.exe');
const recPath = path.join(app.getAppPath(), 'recording/mic.webm');

// Start recording the mic to a seperate file
function start(micname: string) {
    console.log(`recording mic to ${recPath}`);

    ffmpeg.setFfmpegPath(ffmpegPath);

    command = ffmpeg()
        .input(`audio=Microphone (${micname})`)
        .inputFormat('dshow')
        // .audioCodec('pcm_s16le')
        .audioCodec('libopus')
        .save(recPath)
        .on('end', () => {
            console.log('Mic Recording finished OK!');
        })
        .on('error', (err) => {
            console.log(`FFMPEG error occurred: ${err.message}`);
        })
        .addOptions(['-loglevel', 'debug'])

}

function stop() {
    command.kill('SIGINT');
}

export default { start, stop }