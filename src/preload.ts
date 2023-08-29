const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  surveyCompleted: () => {
    ipcRenderer.send('run-game');
  }
});
