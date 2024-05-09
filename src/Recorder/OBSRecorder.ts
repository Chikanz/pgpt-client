import path from 'path';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { byOS, OS, getOS } from './operating-systems';

import * as osn from 'obs-studio-node';
import { v4 as uuid } from 'uuid';
import { recordingPath } from '../paths';
import {  Display, Size, screen } from 'electron';

let obsInitialized = false;
let scene: osn.IScene;

// When packaged, we need to fix some paths
function fixPathWhenPackaged(p) {
  return p.replace("app.asar", "app.asar.unpacked");
}

// Init the library, launch OBS Studio instance, configure it, set up sources and scene
function initialize(micname: string, win?: Electron.BrowserWindow) {
  if (obsInitialized) {
    console.warn("OBS is already initialized, skipping initialization.");
    return;
  }

  initOBS();
  configureOBS();
  scene = setupScene();
  setupSources(micname);
  obsInitialized = true;

  if(win) {
    const perfStatTimer = setInterval(() => {
      win.webContents.send("performanceStatistics", osn.NodeObs.OBS_API_getPerformanceStatistics());
    }, 1000);
    win.on('close', () => clearInterval(perfStatTimer));
  }

}

function initOBS() {
  console.debug('Initializing OBS...');
  osn.NodeObs.IPC.host(`dook-obs-${uuid()}`);
  const workingPath = fixPathWhenPackaged(path.join(__dirname, '../../../', 'node_modules', 'obs-studio-node'));
  console.log(workingPath);
  osn.NodeObs.SetWorkingDirectory(workingPath);

  const obsDataPath = fixPathWhenPackaged(path.join(__dirname, 'osn-data')); // OBS Studio configs and logs
  // Arguments: locale, path to directory where configuration and logs will be stored, your application version
  const initResult = osn.NodeObs.OBS_API_initAPI('en-US', obsDataPath, '1.0.0','');

  if (initResult !== 0) {
    const errorReasons = {
      '-2': 'DirectX could not be found on your system. Please install the latest version of DirectX for your machine here <https://www.microsoft.com/en-us/download/details.aspx?id=35?> and try again.',
      '-5': 'Failed to initialize OBS. Your video drivers may be out of date, or Streamlabs OBS may not be supported on your system.',
    }

    const errorMessage = errorReasons[initResult.toString()] || `An unknown error #${initResult} was encountered while initializing OBS.`;

    console.error('OBS init failure', errorMessage);

    shutdown();

    throw Error(errorMessage);
  }

  osn.NodeObs.OBS_service_connectOutputSignals((signalInfo) => {
    signals.next(signalInfo);
  });

  console.debug('OBS initialized');
}

function GetEncoders(){
  return getAvailableValues('Output', 'Recording', 'RecEncoder');
}

function configureOBS() {
  console.debug('Configuring OBS');
  setSetting('Output', 'Mode', 'Advanced');
  const availableEncoders = GetEncoders();
  setSetting('Output', 'RecEncoder', prioritizeEncoder(availableEncoders));
  setSetting('Output', 'RecFilePath', recordingPath);
  setSetting('Output', 'RecFormat', 'mp4');
  const bitrate = 5000;
  setSetting('Output', 'Recbitrate', bitrate);
  setSetting('Output', 'Recmax_bitrate', bitrate);
  setSetting('Video', 'FPSType', "Integer FPS Value");
  setSetting('Video', 'FPSInt', 45);

  console.debug('OBS Configured');
}

function prioritizeEncoder(availableEncoders: string[]): string | null {
  const priorityList = [
    'jim_hevc_nvenc',
    'jim_nvenc',
    'amd_amf_hvec',
    'amd_amf_h264',
    'ffmpeg_nvenc',
    'obs_qsv11',
    'obs_x264',
    'none'
  ];

  for (const preferredEncoder of priorityList) {
    if (availableEncoders.includes(preferredEncoder)) {
      console.log("Chose encoder: " + preferredEncoder);
      return preferredEncoder;
    }
  }

  return null; // return null if no encoder is found in the list
}

function isVirtualCamPluginInstalled() {
  return osn.NodeObs.OBS_service_isVirtualCamPluginInstalled();
}

function installVirtualCamPlugin() {
  osn.NodeObs.OBS_service_installVirtualCamPlugin();
  return osn.NodeObs.OBS_service_isVirtualCamPluginInstalled();
}

function uninstallVirtualCamPlugin() {
  osn.NodeObs.OBS_service_uninstallVirtualCamPlugin();
  return !osn.NodeObs.OBS_service_isVirtualCamPluginInstalled();
}

function startVirtualCam() {
  osn.NodeObs.OBS_service_createVirtualWebcam("obs-studio-node-example-cam");
  osn.NodeObs.OBS_service_startVirtualWebcam();
}

function stopVirtualCam() {
  osn.NodeObs.OBS_service_stopVirtualWebcam();
  osn.NodeObs.OBS_service_removeVirtualWebcam();
}


// Get information about prinary display
function displayInfo() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const { scaleFactor } = primaryDisplay;
  return {
    width,
    height,
    scaleFactor: scaleFactor,
    aspectRatio: width / height,
    physicalWidth: width * scaleFactor,
    physicalHeight: height * scaleFactor,
  }
}

function getCameraSource() {
  console.debug('Trying to set up web camera...')

  // Setup input without initializing any device just to get list of available ones
  const dummyInput = byOS({
    [OS.Windows]: () =>
      osn.InputFactory.create('dshow_input', 'video', {
        audio_device_id: 'does_not_exist',
        video_device_id: 'does_not_exist',
      }),
    [OS.Mac]: () =>
      osn.InputFactory.create('av_capture_input', 'video', {
        device: 'does_not_exist',
      })
  });

  const cameraItems = dummyInput.properties.get(byOS({ [OS.Windows]: 'video_device_id', [OS.Mac]: 'device' })).details.items;

  dummyInput.release();

  if (cameraItems.length === 0) {
    console.debug('No camera found!!')
    return null;
  }

  const deviceId = cameraItems[0].value;
  cameraItems[0].selected = true;
  console.debug('cameraItems[0].name: ' + cameraItems[0].name);

  const obsCameraInput = byOS({
    [OS.Windows]: () =>
      osn.InputFactory.create('dshow_input', 'video', {
        video_device_id: deviceId,
      }),
    [OS.Mac]: () =>
      osn.InputFactory.create('av_capture_input', 'video', {
        device: deviceId,
      }),
  })

  // It's a hack to wait a bit until device become initialized (maximum for 1 second)
  // If you know proper way how to determine whether camera is working and how to subscribe for any events from it, create a pull request
  // See discussion at https://github.com/Envek/obs-studio-node-example/issues/10
  for (let i = 1; i <= 4; i++) {
    if (obsCameraInput.width === 0) {
      const waitMs = 100 * i;
      console.debug(`Waiting for ${waitMs}ms until camera get initialized.`);
      busySleep(waitMs); // We can't use async/await here
    }
  }

  if (obsCameraInput.width === 0) {
    console.debug(`Found camera "${cameraItems[0].name}" doesn't seem to work as its reported width is still zero.`);
    return null;
  }

  // Way to update settings if needed:
  // let settings = obsCameraInput.settings;
  // console.debug('Camera settings:', obsCameraInput.settings);
  // settings['width'] = 320;
  // settings['height'] = 240;
  // obsCameraInput.update(settings);
  // obsCameraInput.save();

  return obsCameraInput;
}

function setupScene() {
  const videoSource = osn.InputFactory.create(byOS({ [OS.Windows]: 'monitor_capture', [OS.Mac]: 'display_capture' }), 'desktop-video');

  const displays = getAvailableDisplays();
  const primaryDisplay = displays.find(display => display.primary);

  // Update source settings:
  let settings = videoSource.settings;
  settings.monitor = primaryDisplay.index;
  settings.capture_cursor = false;
  settings['width'] = primaryDisplay.physicalSize.width;
  settings['height'] = primaryDisplay.physicalSize.height;
  videoSource.update(settings);
  videoSource.save();

  // Set output video size to 1920x1080
  const outputWidth = 1920;
  const outputHeight = Math.round(outputWidth / primaryDisplay.aspectRatio);
  setSetting('Video', 'Base', `${outputWidth}x${outputHeight}`);
  setSetting('Video', 'Output', `${outputWidth}x${outputHeight}`);
  const videoScaleFactor = primaryDisplay.physicalSize.width / outputWidth;

  // A scene is necessary here to properly scale captured screen size to output video size
  const scene = osn.SceneFactory.create('test-scene');
  const sceneItem = scene.add(videoSource);
  sceneItem.scale = { x: 1.0 / videoScaleFactor, y: 1.0 / videoScaleFactor };

  // If camera is available, make it smaller and place it right in the corner of the display
  //Disable camera for now
  // const cameraSource = getCameraSource();
  const cameraSource = null;
  if (cameraSource && false) {
    const cameraItem = scene.add(cameraSource);

    // Adjust this value to make the webcam view smaller
    const smallerFactor = 5.0; // Adjust this value as needed to get the desired size
    const cameraScaleFactor = 1.0 / (smallerFactor * cameraSource.width / outputWidth);

    cameraItem.scale = { x: cameraScaleFactor, y: cameraScaleFactor };

    // Updated position to put it right in the corner
    cameraItem.position = {
      x: outputWidth - cameraSource.width * cameraScaleFactor,
      y: outputHeight - cameraSource.height * cameraScaleFactor,
    };
  }

  return scene;
}

function getAudioDevices(type, subtype, deviceName = null) {
  const dummyDevice = osn.InputFactory.create(type, subtype, { device_id: 'does_not_exist' });
  // @ts-ignore
  const devices = dummyDevice.properties.get('device_id').details.items.map(({ name, value }) => {
    return { device_id: value, name, };
  }).filter(device => {
    if (deviceName) {
      return device.name.toLowerCase().includes(deviceName.toLowerCase());
    }
    return true;
  });
  dummyDevice.release();
  return devices;
};

//idk why this works but it does lol. Still outputs extra audio tracks but oh well
function setupSources(micname: string) {
  osn.Global.setOutputSource(1, scene);

  setSetting('Output', 'Track1Name', 'Mixed: all sources');

  let currentTrack = 2;
  getAudioDevices(byOS({ [OS.Windows]: 'wasapi_output_capture', [OS.Mac]: 'coreaudio_output_capture' }), 'desktop-audio').forEach(metadata => {
    if (metadata.device_id === 'default') return;
    const source = osn.InputFactory.create(byOS({ [OS.Windows]: 'wasapi_output_capture', [OS.Mac]: 'coreaudio_output_capture' }), 'desktop-audio', { device_id: metadata.device_id });
    const fader = osn.FaderFactory.create(0);
    fader.attach(source);
    fader.mul = 0.05;

    source.audioMixers = 1; // Bit mask to output to only tracks 1 and current track
    osn.Global.setOutputSource(currentTrack, source);
    currentTrack++;
  });

  getAudioDevices(byOS({ [OS.Windows]: 'wasapi_input_capture', [OS.Mac]: 'coreaudio_input_capture' }), 'mic-audio', micname).forEach(metadata => {
    if (metadata.device_id === 'default') return;
    const source = osn.InputFactory.create(byOS({ [OS.Windows]: 'wasapi_input_capture', [OS.Mac]: 'coreaudio_input_capture' }), 'mic-audio', { device_id: metadata.device_id });
    setSetting('Output', 'Track2Name', 'Mic Only');
    source.audioMixers = 1 | 2; // Bit mask to output to both track 1 and track 2
    osn.Global.setOutputSource(currentTrack, source);
  });

  setSetting('Output', 'RecTracks', parseInt('1'.repeat(4), 2)); // Bit mask of used tracks: 1111 to use first four (from available six)
}



const displayId = 'display1';

function setupPreview(window, bounds) {
  osn.NodeObs.OBS_content_createSourcePreviewDisplay(
    window.getNativeWindowHandle(),
    scene.name, // or use camera source Id here
    displayId,
  );
  osn.NodeObs.OBS_content_setShouldDrawUI(displayId, false);
  osn.NodeObs.OBS_content_setPaddingSize(displayId, 0);
  // Match padding color with main window background color
  osn.NodeObs.OBS_content_setPaddingColor(displayId, 255, 255, 255);

  return resizePreview(window, bounds);
}
let existingWindow = false
let initY = 0
function resizePreview(window, bounds) {
  let { aspectRatio, scaleFactor } = displayInfo();
  if (getOS() === OS.Mac) {
    scaleFactor = 1
  }
  const displayWidth = Math.floor(bounds.width);
  const displayHeight = Math.round(displayWidth / aspectRatio);
  const displayX = Math.floor(bounds.x);
  const displayY = Math.floor(bounds.y);
  if (initY === 0) {
    initY = displayY
  }
  osn.NodeObs.OBS_content_resizeDisplay(displayId, displayWidth * scaleFactor, displayHeight * scaleFactor);

  if (getOS() === OS.Mac) {
    // if (existingWindow) {
    //   nwr.destroyWindow(displayId);
    //   nwr.destroyIOSurface(displayId);
    // }
    // const surface = osn.NodeObs.OBS_content_createIOSurface(displayId)
    // nwr.createWindow(
    //   displayId,
    //   window.getNativeWindowHandle(),
    // );
    // nwr.connectIOSurface(displayId, surface);
    // nwr.moveWindow(displayId, displayX * scaleFactor, (initY - displayY + initY) * scaleFactor)
    // existingWindow = true
  } else {
    osn.NodeObs.OBS_content_moveDisplay(displayId, displayX * scaleFactor, displayY * scaleFactor);
  }

  return { height: displayHeight }
}

async function start() {
  // if (!obsInitialized) initialize();

  let signalInfo;

  console.debug('Starting recording...');
  osn.NodeObs.OBS_service_startRecording();

  console.debug('Started?');
  signalInfo = await getNextSignalInfo();

  if (signalInfo.signal === 'Stop') {
    throw Error(signalInfo.error);
  }

  console.debug('Started signalInfo.type:', signalInfo.type, '(expected: "recording")');
  console.debug('Started signalInfo.signal:', signalInfo.signal, '(expected: "start")');
  console.debug('Started!');
}

async function stop() {
  let signalInfo;

  console.debug('Stopping recording...');
  osn.NodeObs.OBS_service_stopRecording();
  console.debug('Stopped?');

  signalInfo = await getNextSignalInfo();

  console.debug('On stop signalInfo.type:', signalInfo.type, '(expected: "recording")');
  console.debug('On stop signalInfo.signal:', signalInfo.signal, '(expected: "stopping")');

  signalInfo = await getNextSignalInfo();

  console.debug('After stop signalInfo.type:', signalInfo.type, '(expected: "recording")');
  console.debug('After stop signalInfo.signal:', signalInfo.signal, '(expected: "stop")');

  console.debug('Stopped!');
}

function shutdown() {
  if (!obsInitialized) {
    console.debug('OBS is already shut down!');
    return false;
  }

  console.debug('Shutting down OBS...');

  try {
    osn.NodeObs.OBS_service_removeCallback();
    osn.NodeObs.IPC.disconnect();
    obsInitialized = false;
  } catch (e) {
    throw Error('Exception when shutting down OBS process' + e);
  }

  console.debug('OBS shutdown successfully');

  return true;
}

function setSetting(category, parameter, value) {
  let oldValue;

  // Getting settings container
  const settings = osn.NodeObs.OBS_settings_getSettings(category).data;

  settings.forEach(subCategory => {
    subCategory.parameters.forEach(param => {
      if (param.name === parameter) {
        oldValue = param.currentValue;
        param.currentValue = value;
      }
    });
  });

  // Saving updated settings container
  if (value != oldValue) {
    osn.NodeObs.OBS_settings_saveSettings(category, settings);
  }
}

function getAvailableValues(category, subcategory, parameter) {
  const categorySettings = osn.NodeObs.OBS_settings_getSettings(category).data;
  if (!categorySettings) {
    console.warn(`There is no category ${category} in OBS settings`);
    return [];
  }

  const subcategorySettings = categorySettings.find(sub => sub.nameSubCategory === subcategory);
  if (!subcategorySettings) {
    console.warn(`There is no subcategory ${subcategory} for OBS settings category ${category}`);
    return [];
  }

  const parameterSettings = subcategorySettings.parameters.find(param => param.name === parameter);
  if (!parameterSettings) {
    console.warn(`There is no parameter ${parameter} for OBS settings category ${category}.${subcategory}`);
    return [];
  }

  return parameterSettings.values.map(value => Object.values(value)[0]);
}

const signals = new Subject();

function getNextSignalInfo() {
  return new Promise((resolve, reject) => {
    signals.pipe(first()).subscribe(signalInfo => resolve(signalInfo));
    setTimeout(() => reject('Output signal timeout'), 30000);
  });
}

function busySleep(sleepDuration) {
  var now = new Date().getTime();
  while (new Date().getTime() < now + sleepDuration) { /* do nothing */ };
}

type OurDisplayType = {
  id: number;
  index: number;
  // physicalPosition: string;
  primary: boolean;
  displayFrequency: number;
  depthPerComponent: number;
  size: Size;
  physicalSize: Size;
  aspectRatio: number;
  scaleFactor: number;
};

// Stole this absolutely GOATED code from https://github.dev/aza547/wow-recorder
/**
 * Get and return a list of available displays on the system sorted by their
 * physical position.
 *
 * This makes no attempts at being perfect - it completely ignores the `bounds.y`
 * property for people who might have stacked their displays vertically rather than
 * horizontally. This is okay.
 */
const getAvailableDisplays = (): OurDisplayType[] => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const allDisplays = screen.getAllDisplays();

  // Create an unsorted list of Display IDs to zero based monitor index
  // So we're can use that index later, after sorting the displays according
  // to their physical location.
  const displayIdToIndex: { [key: number]: number } = {};

  allDisplays.forEach((display: Display, index: number) => {
    displayIdToIndex[display.id] = index;
  });

  // Iterate over all available displays and make our own list with the
  // relevant attributes and some extra stuff to make it easier for the
  // frontend.
  const ourDisplays: OurDisplayType[] = [];
  const numberOfMonitors = allDisplays.length;

  allDisplays
    .sort((A: Display, B: Display) => A.bounds.x - B.bounds.x)
    .forEach((display: Display, index: number) => {
      const isPrimary = display.id === primaryDisplay.id;
      const displayIndex = displayIdToIndex[display.id];
      const { width, height } = display.size;

      ourDisplays.push({
        id: display.id,
        index: displayIndex,
        // physicalPosition: getDisplayPhysicalPosition(numberOfMonitors, index),
        primary: isPrimary,
        displayFrequency: display.displayFrequency,
        depthPerComponent: display.depthPerComponent,
        size: display.size,
        scaleFactor: display.scaleFactor,
        aspectRatio: width / height,
        physicalSize: {
          width: Math.floor(width * display.scaleFactor),
          height: Math.floor(height * display.scaleFactor),
        },
      });
    });

  return ourDisplays;
};


export { 
  initialize,
  start,
  isVirtualCamPluginInstalled,
  installVirtualCamPlugin,
  uninstallVirtualCamPlugin,
  startVirtualCam,
  stopVirtualCam,
  stop,
  shutdown,
  setupPreview,
  resizePreview,
  GetEncoders
};

