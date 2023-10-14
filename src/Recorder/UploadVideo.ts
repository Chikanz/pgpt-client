import axios, { AxiosError } from "axios";
import { config } from "../types/config";
// import tus from 'tus-js-client'; // idk why this doesn't work
const tus = require('tus-js-client');
import fs from 'fs';

interface uploadResponse {
    AuthorizationSignature: string,
    AuthorizationExpire: string,
    VideoId: string,
    LibraryId: string,
    Title: string,
}

export default async function UploadVideo(config: config) {
    //First tell server we're uploading a vid and get the key
    const res = await axios.post(`${process.env.SERVER_URL}/api/client/startUpload`, {
        TestID: config.TestID,
        PlayerID: config.PlayerID,
    }).catch((e: AxiosError) => {
        console.log(e.response?.data);
        return null;
    });

    const UploadHeaders: uploadResponse = res.data;

    //OBS sets the video file to a date that we don't know so we can just find the first mp4 file in the recordings folder
    
    const files = fs.readdirSync(`${process.env.PORTABLE_EXECUTABLE_DIR! || __dirname}/recordings`);
    let filename;
    for (const file of files) {
        if (file.endsWith(".mp4")) {
            filename = file;
            console.log(file);
            break;
        }
    }
    const file = fs.createReadStream(`${process.env.PORTABLE_EXECUTABLE_DIR! || __dirname}/recordings/${filename}`)

    //Then upload the video using TUS
    const { Title, ...headers } = UploadHeaders;
    try {
        await TUSUpload(file, headers, Title)
        console.log("Successfully uploaded!")
    } catch (err) {
        console.log("Failed because: " + err)
    }
}

type headers = { AuthorizationSignature: string; AuthorizationExpire: string; VideoId: string; LibraryId: string; }
async function TUSUpload(file: fs.ReadStream, headers: headers, title: string) {
    return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
            endpoint: "https://video.bunnycdn.com/tusupload",
            retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
            headers,
            metadata: {
                filetype: "video/mp4",
                title: title,
            },
            onError: reject,
            onProgress: function (bytesUploaded, bytesTotal) {
                console.log("Progress: " + (bytesUploaded / bytesTotal * 100).toFixed(2) + "%")
            },
            onSuccess: resolve
        })

        upload.start();
    })
}