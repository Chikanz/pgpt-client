import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export default function loadConfig() {
  try {
    console.log(process.env.NODE_ENV)
    const isDevelopment = !app.isPackaged;

    const configPath = isDevelopment
      ? path.join(__dirname, 'mock-config.json') // Adjust this path to your development config
      : path.join(process.env.PORTABLE_EXECUTABLE_DIR!, 'config.json');

      console.log(configPath);

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