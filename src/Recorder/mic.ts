import ffmpeg from 'fluent-ffmpeg';
import { app } from 'electron';
import path from 'path';

let command: ffmpeg.FfmpegCommand;
const ffmpegPath = path.join(app.getAppPath(), 'bin/ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);

// Start recording the mic to a seperate file
function start(micname: string) {
    console.log(`audio=Microphone (${micname})`);
    // Set FFmpeg path to bundled FFmpeg executable

    command = ffmpeg()
        .input(`audio=Microphone (${micname})`)
        .inputFormat('dshow')
        .audioCodec('libopus')
        .save('microphone.webm')
        .on('end', () => {
            console.log('Recording finished');
        })
        .on('error', (err) => {
            console.log(`An error occurred: ${err.message}`);
        })
}

function stop() {
    command.kill('SIGTERM');
}

export default { start, stop }