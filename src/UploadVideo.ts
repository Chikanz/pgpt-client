import axios from "axios";
import config from "./types/config";
import tus from 'tus-js-client';
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
    }).catch(e => { console.log(e)});

    const UploadHeaders: uploadResponse = res.data;

    //Load file from /recordings/recording.webm with FS and convert to blob
    const file = fs.createReadStream(`${process.env.PORTABLE_EXECUTABLE_DIR! || __dirname}/recordings/recording.webm`)

    //Then upload the video using TUS
    const {Title, ...headers} = UploadHeaders;
    var upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
        headers,
        metadata: {
            filetype: "video/webm",
            title: Title,
        },
        onError: function (error) { console.log("Failed because: " + error) },
        onProgress: function (bytesUploaded, bytesTotal) { console.log("Progress: " + (bytesUploaded / bytesTotal * 100).toFixed(2) + "%")},
        onSuccess: function () { console.log("Successfully uploaded!") }
    })

    // Check if there are any previous uploads to continue.
    upload.findPreviousUploads().then(function (previousUploads) {
        // Found previous uploads so we select the first one. 
        if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0])
        }

        // Start the upload
        upload.start()
    })

}