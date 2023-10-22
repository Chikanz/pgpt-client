import { app } from 'electron';
import path from 'path';

const resourcesPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
const exePath = path.dirname(app.getPath('exe'));
const rootExePath = process.env.PORTABLE_EXECUTABLE_DIR! || exePath || __dirname;

export { resourcesPath, rootExePath };