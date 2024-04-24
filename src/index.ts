import { app, BrowserWindow, desktopCapturer, dialog, ipcMain } from 'electron';
import dotenv from 'dotenv';
import path from 'path';
const envFile = app.isPackaged ? '.env.production' : ".env.development";
dotenv.config({ path: envFile });
import loadConfig from './loadConfig';
import LaunchGame from './LaunchGame';
import OpenInputSelector from './Recorder/StartRecorder';
import UploadVideo from './Recorder/UploadVideo';
import type { config as configType } from './types/config';
import * as obs from './Recorder/OBSRecorder';
import mic from './Recorder/recordmic';
import fs from 'fs';
import { rootExePath } from './paths';
import ripMic from './Recorder/ripMic';
import yauzl from 'yauzl';
import unzip from './unzip';
import GetVideoPath from './Recorder/GetVideoPath';

let config: configType;
let mainWindow: BrowserWindow;

let canKill = true; //true if we kill the app before the game starts, then only true after upload

//Replace all console logs with a log file
const logStream = fs.createWriteStream(`${rootExePath}/main.log`, { flags: 'a' });

console.log = function (msg) {
  if (app.isPackaged) logStream.write(msg + '\n');
  process.stdout.write(msg + '\n');
};
console.debug = function (msg) {
  if (app.isPackaged) logStream.write(msg + '\n');
  if(process.env.DEBUG) process.stdout.write(msg + '\n');
};

// Load the first survey on startup
app.on('ready', async () => {
  console.log("Loading config...");
  try {
    config = loadConfig();
  }
  catch (err) {
    console.log("Quitting due to config error: " + err.message);
    app.quit();
    return;
  }
  createSurveyWindow(config.PreSurveyID);

  //Uncomment to upload a vid from file 
  // if(process.env.DEBUG) {
  //   const videoPath = GetVideoPath();
  //   await ripMic(videoPath).catch((err) => {
  //     console.log("Error ripping mic: " + err.message);
  //   });
    
  //   await UploadVideo(videoPath, config);
  //   app.exit();
  // }

  //TODO try catch and delete game zip after done 
  //Unzip game.zip in background using yazul
  unzip('game.zip', 'game');
});


app.on('window-all-closed', (e) => {
  console.log("All windows closed")
  if (!canKill) {
    e.preventDefault();
    //Poll every 5 seconds to see if we can close
    if (hasFinishedGame) {
      const interval = setInterval(() => {
        if (canKill) {
          clearInterval(interval);
          console.log("See ya later! - can kill now");
          app.quit();
        }
      }, 5000);
    }
  }
  else {
    console.log("See ya later! - all windows closed");
    app.quit();
  }
});

function createSurveyWindow(surveyID: string) {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // if (app.isPackaged)
  mainWindow.setFullScreen(true);

  // Use the surveyID to form the URL
  const url = `${config.RootURL}/s/${surveyID}?pid=${config.PlayerID}`;
  console.log(`\n\n\n\n${url}`);
  mainWindow.loadURL(url);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

//Runs on pre and post survey completed.
let hasFinishedGame = false;
let recordingWindow: BrowserWindow;
ipcMain.on('survey-completed', (event, arg) => {
  console.log("Survey completed");
  mainWindow.close();

  if (!hasFinishedGame) {
    //Open a window for the user to select their microphone and camera
    recordingWindow = OpenInputSelector();
  }
});

ipcMain.on('start-recording', (event, arg) => {
  console.log("Starting recording");
  recordingWindow.loadFile(path.join(__dirname, 'html/loading.html'));
  //Get mic and camera name from arg
  const micName = arg[0];
  const cameraName = arg[1]; //todo

  //Create the recording dir
  // console.log("Opening OBS debug window...");
  const recPath = path.join(rootExePath, 'recording');
  fs.mkdirSync(recPath, { recursive: true })

  //if debug open obs debug window
  let debugWindow: BrowserWindow;
  if (process.env.DEBUG) {
    console.log("Opening OBS debug window...");
    debugWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });
    debugWindow.loadFile(path.join(__dirname, 'html/obsDebug.html'));

    ipcMain.handle('preview-init', (event, bounds) => {
      return obs.setupPreview(debugWindow, bounds);
    });

    ipcMain.handle('preview-bounds', (event, bounds) => {
      return obs.resizePreview(debugWindow, bounds);
    });
  }

  //Fire up obs
  console.log("Starting OBS...");
  obs.initialize(micName, debugWindow);
  if (debugWindow) debugWindow.webContents.send("encoders", obs.GetEncoders());
  obs.start();
  recordingWindow.close();

  //Start the game
  const gameProcess = LaunchGame(config.GamePath);
  canKill = false;

  //When the game closes, stop OBS + open post survey
  gameProcess.on('close', async () => {
    hasFinishedGame = true;
    if (process.env.DEBUG) debugWindow.close();
    createSurveyWindow(config.PostSurveyID);
    obs.stop();
    obs.shutdown();

    //sleep
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const videoPath = GetVideoPath();
    await ripMic(videoPath).catch((err) => {
      console.log("Error ripping mic: " + err.message);
    });
    
    UploadVideo(videoPath, config).then(() => {
      canKill = true;
    });
  });
});
