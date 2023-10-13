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

  //Fire up obs
  obs.initialize(micName);
  obs.start();
  recordingWindow.close();

  //Start the game
  const gameProcess = LaunchGame(config.GamePath);

  console.log('a');

  //When the game closes, stop OBS + open post survey
  gameProcess.on('close', () => {
    hasFinishedGame = true;
    createSurveyWindow(config.PostSurveyID);
    obs.stop();
    obs.shutdown();

    UploadVideo(config).then(() => {
      canKill = true;
    });
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
    // Prevent default behavior
  }
});
