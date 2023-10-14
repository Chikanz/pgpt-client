import { app, BrowserWindow, desktopCapturer, dialog, ipcMain } from 'electron';
import dotenv from 'dotenv';
import path from 'path';
const envFile = app.isPackaged ? '.env.production' : ".env.development";
dotenv.config({ path: envFile });
import loadConfig from './loadConfig';
import LaunchGame from './LaunchGame';
import OpenRecordingSelector from './Recorder/StartRecorder';
import UploadVideo from './Recorder/UploadVideo';
import type { config as configType } from './types/config';
import * as obs from './Recorder/OBSRecorder';
import mic from './Recorder/mic';

let config: configType;
let mainWindow: BrowserWindow;

let canKill = false; //Only true once we finish uploading

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
  const url = `http://localhost:5173/s/${surveyID}`;
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
  mainWindow.close();

  if (!hasFinishedGame) {
    //Open a window for the user to select their microphone and camera
    recordingWindow = OpenRecordingSelector();
  }
});

ipcMain.on('start-recording', (event, arg) => {
  //Get mic and camera name from arg
  const micName = arg[0];
  const cameraName = arg[1]; //todo

  //if debug open obs debug window
  let debugWindow: BrowserWindow;
  if (process.env.DEBUG || true) {
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
  obs.initialize(micName, debugWindow);
  obs.start();
  mic.start(micName);
  recordingWindow.close();

  //Start the game
  const gameProcess = LaunchGame(config.GamePath);

  //When the game closes, stop OBS + open post survey
  gameProcess.on('close', () => {
    hasFinishedGame = true;
    debugWindow.close();
    createSurveyWindow(config.PostSurveyID);
    obs.stop();
    mic.stop();
    obs.shutdown();

    canKill = true;
    // UploadVideo(config).then(() => {
    //   canKill = true;
    // });
  });
});

// Load the first survey on startup
app.on('ready', () => {
  console.log("Loading config...");
  try {
    config = loadConfig();
  }
  catch (err) {
    app.quit();
  }
  console.log(config);
  let SurveyID = config.SurveyID;
  createSurveyWindow(SurveyID);
});


app.on('activate', () => {
  if (mainWindow === null) {
    console.log("activate");
    createSurveyWindow("123");
  }
});

app.on('window-all-closed', (e) => {
  if (!canKill) {
    e.preventDefault();
    //Poll every 5 seconds to see if we can close
    const interval = setInterval(() => {
      if (canKill) {
        clearInterval(interval);
        console.log("See ya later!");
        app.quit();
      }
    }, 5000);
  }
  else {
    console.log("See ya later!");
    app.quit();
  }
});
