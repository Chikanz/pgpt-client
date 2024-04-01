import { ipcRenderer } from 'electron';

//Todo make this a multi stage process so that we can kill the video camera in time

document.addEventListener('DOMContentLoaded', () => {
    const microphonesSelect = document.getElementById('microphones') as HTMLSelectElement;
    // const camerasSelect = document.getElementById('cameras') as HTMLSelectElement;
    const videoElement = document.getElementById('preview') as HTMLVideoElement;
    const videoToggle = document.getElementById('videoToggle');
    const startButton = document.getElementById('start');
    let videoEnabled = true;

    // videoElement.style.display = 'none';

    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label;

                if (device.kind === 'audioinput') {
                    microphonesSelect.appendChild(option);
                } else if (device.kind === 'videoinput') {
                    // camerasSelect.appendChild(option.cloneNode(true));
                }
            });
        }).then(() => updatePreview());

    // videoToggle.addEventListener('click', () => {
    //     videoEnabled = !videoEnabled;
    //     videoElement.style.display = videoEnabled ? 'block' : 'none';
    //     updatePreview();
    // });

    microphonesSelect.addEventListener('change', updatePreview);
    // camerasSelect.addEventListener('change', updatePreview);

    function updatePreview() {
        return; //Disabled video for now 
        // if (videoEnabled) {
        //     const audioSource = microphonesSelect.value;
        //     const videoSource = camerasSelect.value;
        //     const constraints = {
        //         audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
        //         video: { deviceId: videoSource ? { exact: videoSource } : undefined }
        //     };

        //     navigator.mediaDevices.getUserMedia(constraints)
        //         .then(stream => {
        //             videoElement.srcObject = stream;
        //         })
        //         .catch(error => {
        //             console.error('Error accessing media devices.', error);
        //         });
        // } else if (videoElement.srcObject) {
        //     const mediaStream = videoElement.srcObject as MediaStream;
        //     mediaStream.getTracks().forEach(track => track.stop());
        // }
    }
    //Start the recording when the button is pressed  
    startButton.addEventListener('click', async () => {
        //Disable the video while OBS boots up otherwise it won't work!
        videoEnabled = false;
        // updatePreview(); 
        
        startButton.innerHTML = "Just a sec...";

        //OBS sometimes just doesn't work :( so we need to wait a bit

        const selectedMicLabel = microphonesSelect.options[microphonesSelect.selectedIndex].textContent;
        const match = selectedMicLabel.match(/\((.*?)\)/); //Get the mic name from the label
        const cleanMicName = match ? match[1] : "Unknown";
        console.log(`Selected mic: ${cleanMicName}`);
        // console.log(`Selected camera: ${camerasSelect.value} + Selected mic: ${cleanMicName}`);
        // ipcRenderer.send('start-recording', [cleanMicName, camerasSelect.value]);
        ipcRenderer.send('start-recording', [cleanMicName]);
    });
});

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
