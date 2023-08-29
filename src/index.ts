import { app, BrowserWindow, ipcMain } from 'electron';
import dotenv from 'dotenv';
import path from 'path';
const envFile = app.isPackaged ? '.env.production' : ".env.development";
dotenv.config({ path: envFile });
import loadConfig from './loadConfig';
import LaunchGame from './LaunchGame';

interface config {
  SurveyID: string;
  GamePath: string;
}

let config: config;
let mainWindow;

function createSurveyWindow(surveyID: string) {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    // frame: false,
    // fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (app.isPackaged)
    mainWindow.setFullScreen(true);

  // Use the surveyID to form the URL
  const url = `${process.env.SERVER_URL}/s/${surveyID}`;
  console.log(`\n\n\n\n${url}`);
  mainWindow.loadURL(url);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

//Start the game + start recording
ipcMain.on('run-game', (event, arg) => {
  LaunchGame(config.GamePath);
});

// Load the first survey on startup
app.on('ready', () => {
  console.log("Loading config...");
  config = loadConfig();
  let SurveyID = config.SurveyID;
  createSurveyWindow(SurveyID);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    console.log("activate");
    createSurveyWindow("123");
  }
});