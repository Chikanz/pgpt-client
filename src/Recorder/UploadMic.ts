import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { app } from 'electron/main';
import { recordingPath } from '../paths';

export default async function UploadMic(TestID: string, PlayerID: string, GameplayID: string) {
    console.log("Uploading mic...");
    const url = `${process.env.SERVER_URL}/api/client/transcribe`; // Replace with your actual endpoint URL
    const filePath = `${recordingPath}/mic.webm`;

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
        console.error('Error uploading file:', error.message);
        app.quit();
    });
}