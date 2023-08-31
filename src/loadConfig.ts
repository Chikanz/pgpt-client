import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export default function loadConfig() {
  try {
    const isDevelopment = !app.isPackaged;

    const exePath = app.getPath('exe');
    const configPath = isDevelopment
      ? path.join(__dirname, 'config.json') // Adjust this path to your development config
      : path.join(process.env.PORTABLE_EXECUTABLE_DIR! || exePath, 'config.json');

    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found at ${configPath}`);
    }

    const rawData = fs.readFileSync(configPath, 'utf-8');

    return JSON.parse(rawData);
  }
  catch (err) {
    console.log("Couldn't read config file")
    console.error(err);
    return null;
  }
}