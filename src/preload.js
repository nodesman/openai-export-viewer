
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openZipFile: () => ipcRenderer.invoke('open-zip-file'),
    extractMessages: (conversation) => ipcRenderer.invoke('extract-messages', conversation),
    windowControl: (action) => ipcRenderer.send('window-control', action),
    platform: process.platform,
    onWindowState: (callback) => ipcRenderer.on('window-state', (event, state) => callback(state))
});
