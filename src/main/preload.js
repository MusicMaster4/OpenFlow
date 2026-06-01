const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flowLocal', {
  getState: () => ipcRenderer.invoke('get-state'),
  updateSettings: (patch) => ipcRenderer.invoke('update-settings', patch),
  previewOverlayStyle: (patch) => ipcRenderer.send('preview-overlay-style', patch),
  resetModelStats: () => ipcRenderer.invoke('reset-model-stats'),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  onStateUpdate: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('app-state', listener);

    return () => {
      ipcRenderer.removeListener('app-state', listener);
    };
  },
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  openUpdateDownload: () => ipcRenderer.invoke('open-update-download'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('update-status', listener);

    return () => {
      ipcRenderer.removeListener('update-status', listener);
    };
  },
});
