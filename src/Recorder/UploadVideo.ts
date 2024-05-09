import axios, { AxiosError } from "axios";
import { config } from "../types/config";
// import tus from 'tus-js-client'; // idk why this doesn't work
const tus = require('tus-js-client');
import fs from 'fs';
import UploadMic from "./UploadMic";
import { app } from "electron";
import { recordingPath } from "../paths";
import path from "path";

interface uploadResponse {
    AuthorizationSignature: string,
    AuthorizationExpire: string,
    VideoId: string,
    LibraryId: string,
    Title: string,
}
const util = require('util');
export default async function UploadVideo(videoPath: string, config: config) {
    
    if(process.env.noupload){
        console.log("Skipping upload due to noupload env var")
        return;
    }

    console.log("Uploading video")
    // First tell server we're uploading a vid and get the key
    const res = await axios.post(`${config.RootURL}/api/client/UploadGameplay`, {
        TestID: config.TestID,
        PlayerID: config.PlayerID,
    }).catch((err: AxiosError) => {
        console.log("Failed to upload video because: " + err.message);
        console.log(util.inspect(err.response.data, false, null, true /* enable colors */));
    });

    //Upload mic audio 
    if (!res) return;
    UploadMic(config, res.data.VideoId).catch((err) => {
        console.log("Failed to upload mic because: " + err);
    });

    const UploadHeaders: uploadResponse = res.data;
    const file = fs.createReadStream(videoPath);

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
                const progress = (bytesUploaded / bytesTotal * 100).toFixed(2);
                if (progress.includes('.0')) {
                    console.log("Progress: " + progress + "%");
                }
            },
            onSuccess: resolve
        })

        upload.start();
    })
}