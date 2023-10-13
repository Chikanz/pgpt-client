import { ipcRenderer } from 'electron';

document.addEventListener('DOMContentLoaded', () => {
    const microphonesSelect = document.getElementById('microphones') as HTMLSelectElement;
    const camerasSelect = document.getElementById('cameras') as HTMLSelectElement;
    const videoElement = document.getElementById('preview') as HTMLVideoElement;
    const videoToggle = document.getElementById('videoToggle');
    const startButton = document.getElementById('start');
    let videoEnabled = false;

    videoElement.style.display = 'none';

    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label;

                if (device.kind === 'audioinput') {
                    microphonesSelect.appendChild(option);
                } else if (device.kind === 'videoinput') {
                    camerasSelect.appendChild(option.cloneNode(true));
                }
            });
        });

    videoToggle.addEventListener('click', () => {
        videoEnabled = !videoEnabled;
        videoElement.style.display = videoEnabled ? 'block' : 'none';
        updatePreview();
    });

    microphonesSelect.addEventListener('change', updatePreview);
    camerasSelect.addEventListener('change', updatePreview);

    function updatePreview() {
        if (videoEnabled) {
            const audioSource = microphonesSelect.value;
            const videoSource = camerasSelect.value;
            const constraints = {
                audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
                video: { deviceId: videoSource ? { exact: videoSource } : undefined }
            };

            navigator.mediaDevices.getUserMedia(constraints)
                .then(stream => {
                    videoElement.srcObject = stream;
                })
                .catch(error => {
                    console.error('Error accessing media devices.', error);
                });
        } else if (videoElement.srcObject) {
            const mediaStream = videoElement.srcObject as MediaStream;
            mediaStream.getTracks().forEach(track => track.stop());
        }
    }
    //Start the recording when the button is pressed  
    startButton.addEventListener('click', () => {
        videoEnabled = false;
        updatePreview();
        console.log("~~~~~",microphonesSelect.value);
        ipcRenderer.send('start-recording', [microphonesSelect.value, camerasSelect.value]);
        startButton.innerHTML = "Just a sec..."; //todo nicer loading screen
    });
});
