import fs from 'fs';
import path from "path";
import { recordingPath } from '../paths';

export default function GetVideoPath(){
    //OBS sets the video file to a date that we don't know so we can just sort them to grab the most recent
    const files = fs.readdirSync(recordingPath);
    const mp4Files = files.filter(file => file.endsWith('.mp4'));
    const latestFile = mp4Files.sort()[0]; //pretty sure this doesn't work lol
    return path.join(recordingPath, latestFile);
}