import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { config, configSchema } from './types/config';

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

    //enforce schema with zod
    const rawData = fs.readFileSync(configPath, 'utf-8');

    let config: any;
    try {
      console.log(rawData);
      config = configSchema.parse(JSON.parse(rawData));
    }
    catch (err) {
      throw new Error("Config file is invalid");
    }

    return config;
  }
  catch (err) {
    console.log("Couldn't read config file")
    console.error(err);
    return null;
  }
}