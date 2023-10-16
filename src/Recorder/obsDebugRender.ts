
import { ipcRenderer } from "electron";

ipcRenderer.on("performanceStatistics", (_event, data) => onPerformanceStatistics(data));
function onPerformanceStatistics(data) {
  //@ts-ignore
  document.querySelector(".performanceStatistics #cpu").innerText = `${data.CPU} %`;
  //@ts-ignore
  document.querySelector(".performanceStatistics #cpuMeter").value = data.CPU;
  //@ts-ignore
  document.querySelector(".performanceStatistics #numberDroppedFrames").innerText = data.numberDroppedFrames;
  //@ts-ignore
  document.querySelector(".performanceStatistics #percentageDroppedFrames").innerText = `${data.percentageDroppedFrames} %`;
  //@ts-ignore
  document.querySelector(".performanceStatistics #bandwidth").innerText = data.bandwidth;
  //@ts-ignore
  document.querySelector(".performanceStatistics #frameRate").innerText = `${Math.round(data.frameRate)} fps`;
  
}

ipcRenderer.on("encoders", (_event, data) => {
  //Just list all encoders in a p element at the bottom of the page
  const encoders = document.querySelector("#encoders");
  encoders.innerHTML = "";
  for (const encoder of data) {
    const p = document.createElement("p");
    p.innerText = encoder;
    encoders.appendChild(p);
  }
});

//Start the stop watch timer on the rec-timer element
const timer = document.querySelector("#rec-timer");
const startTime = Date.now();
setInterval(() => {
  const elapsed = Date.now() - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  //@ts-ignore
  timer.innerText = `${hours}:${minutes % 60}:${seconds % 60}`;
}, 500);


const previewContainer = document.getElementById('preview');

async function setupPreview() {
  const { width, height, x, y } = previewContainer.getBoundingClientRect();
  const result = await ipcRenderer.invoke('preview-init', { width, height, x, y });
  //@ts-ignore
  previewContainer.style = `height: ${result.height}px`;
}

async function resizePreview() {
  const { width, height, x, y } = previewContainer.getBoundingClientRect();
  const result = await ipcRenderer.invoke('preview-bounds', { width, height, x, y });
  //@ts-ignore
  previewContainer.style = `height: ${result.height}px`;
}

document.addEventListener("scroll",  resizePreview);
var ro = new ResizeObserver(resizePreview);
ro.observe(document.querySelector("#preview"));

try {
  setupPreview();
} catch (err) {
  console.log(err)
}
