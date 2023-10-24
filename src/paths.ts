import { app } from 'electron';
import path from 'path';

const resourcesPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
const rootExePath = process.env.PORTABLE_EXECUTABLE_DIR! || app.getAppPath();
const recordingPath = path.join(rootExePath, 'recording');

export { resourcesPath, rootExePath, recordingPath };