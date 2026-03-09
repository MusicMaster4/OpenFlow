const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flowOverlay', {
  getState: () => ipcRenderer.invoke('get-state'),
  dragTo: (position) => ipcRenderer.send('overlay-drag-move', position),
  endDrag: (position) => ipcRenderer.send('overlay-drag-end', position),
  onStateUpdate: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('app-state', listener);

    return () => {
      ipcRenderer.removeListener('app-state', listener);
    };
  },
});
