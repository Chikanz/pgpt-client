import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { app } from 'electron/main';
import { recordingPath } from '../paths';
import { config } from '../types/config';

export default async function UploadMic(config: config, GameplayID : string) {

    const { TestID, PlayerID } = config;

    const url = `${config.RootURL}/api/client/transcribe`;
    const filePath = `${recordingPath}/mic.webm`;
    console.log("Uploading mic " + filePath + " to " + url);

    //Double check the file exists
    if (!fs.existsSync(filePath)) {
        console.error('Mic file does not exist!');
        return;
    }

    const formData = new FormData();
    formData.append('TestID', TestID);
    formData.append('PlayerID', PlayerID);
    formData.append('GameplayID', GameplayID);

    // Read the file from the filesystem
    const fileStream = fs.createReadStream(filePath);

    // Append the file to the form data
    formData.append('file', fileStream, {
        // You can specify additional info like file type and name here
        knownLength: fs.statSync(filePath).size,
        filename: 'mic.webm',
        contentType: 'audio/webm',
    });

    axios.post(url, formData, {
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
}