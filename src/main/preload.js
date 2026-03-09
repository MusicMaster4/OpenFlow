const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flowLocal', {
  getState: () => ipcRenderer.invoke('get-state'),
  updateSettings: (patch) => ipcRenderer.invoke('update-settings', patch),
  resetModelStats: () => ipcRenderer.invoke('reset-model-stats'),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  onStateUpdate: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('app-state', listener);

    return () => {
      ipcRenderer.removeListener('app-state', listener);
    };
  },
});
