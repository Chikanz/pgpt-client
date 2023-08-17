import { app, BrowserWindow } from 'electron';
import dotenv from 'dotenv';
import path from 'path';
const envFile = app.isPackaged ? '.env.production' : ".env.development";
dotenv.config({ path: envFile });
import loadConfig from './loadConfig';

let mainWindow;

function createSurveyWindow(surveyID: string) {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
    },
  });

  mainWindow.setFullScreen(true);

  // Use the surveyID to form the URL
  const url = `${process.env.SERVER_URL}/s/${surveyID}`;
  // mainWindow.loadURL(url);
  mainWindow.loadURL('https://poly.pizza');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  console.log("Loading config...");
  const config = loadConfig();
  console.log(config);
  let surveyID = config.surveyID;

  // Then create the window
  createSurveyWindow(surveyID);
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