const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  surveyCompleted: () => {
    ipcRenderer.send('survey-completed');
  }
});
