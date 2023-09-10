import { app, BrowserWindow, desktopCapturer, dialog, ipcMain } from 'electron';
import dotenv from 'dotenv';
import path from 'path';
const envFile = app.isPackaged ? '.env.production' : ".env.development";
dotenv.config({ path: envFile });
import loadConfig from './loadConfig';
import LaunchGame from './LaunchGame';
import StartRecording from './Recorder/StartRecorder';
import UploadVideo from './UploadVideo';
import type { config as configType } from './types/config';

let config: configType;
let mainWindow: BrowserWindow;

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
ipcMain.on('survey-completed', (event, arg) => {
  mainWindow.close();

  if (!hasFinishedGame) {
    const gameProcess = LaunchGame(config.GamePath);
    const recordingWindow = StartRecording();

    //When the game closes, close the recording window + open post survey
    gameProcess.on('close', () => {
      hasFinishedGame = true;
      //send save event to recording window
      recordingWindow.webContents.send('stop-recording');
      createSurveyWindow(config.PostSurveyID);

      // Listen for the 'recording-stopped' event from the recording window renderer process
      ipcMain.once('recording-saved', () => {
        console.log("Recording saved, uploading...");
        recordingWindow.close();
        UploadVideo(config);
      });
    });
  }
});

ipcMain.handle('getSources', async () => {
  return await desktopCapturer.getSources({ types: ['window', 'screen'] })
})

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