import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { app } from 'electron/main';
import { recordingPath } from '../paths';
import { config } from '../types/config';
import { calculateSegmentDuration } from './util';

export default async function UploadMic(config: config, GameplayID: string) {

    console.log('Uploading mic...');
    const { TestID, PlayerID } = config;

    const url = `${config.RootURL}/api/client/transcribe`;

    //The mic audio has been split into segments, so we need to find all files starting with mic_
    const files = fs.readdirSync(recordingPath).filter(file => file.startsWith('mic_'));

    const segDur = calculateSegmentDuration();

    const promises = []

    //Loop all files and upload seperately
    for (let i = 0; i < files.length; i++) {
        const partName = files[i];

        const filePath = `${recordingPath}/${partName}`;
        console.log(`Uploading mic part ${i}: ${filePath} to ${url}`);

        //Double check the file exists
        if (!fs.existsSync(filePath)) {
            console.error('Mic file does not exist!');
            return;
        }

        const formData = new FormData();
        formData.append('TestID', TestID);
        formData.append('PlayerID', PlayerID);
        formData.append('GameplayID', GameplayID);
        formData.append('Part', i);
        formData.append('MaxParts', files.length);
        formData.append('SegDur', segDur);

        // Read the file from the filesystem
        const fileStream = fs.createReadStream(filePath);

        // Append the file to the form data
        formData.append('file', fileStream, {
            // You can specify additional info like file type and name here
            knownLength: fs.statSync(filePath).size,
            filename: `mic_${i}.webm`,
            contentType: 'audio/webm',
        });

        const uploadPromise = axios.post(url, formData, {
            headers: {
            ...formData.getHeaders(),
            },
        })
            .then(response => {
            console.log(`Status: ${response.status}`);
            console.log(`Data: ${response.data}`);
            })
            .catch(error => {
            console.error('Error uploading mic:', error.message);
            });

        promises.push(uploadPromise);
    }

    // Wait for all uploads to complete
    await Promise.all(promises);
}