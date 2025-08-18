
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openZipFile: () => ipcRenderer.invoke('open-zip-file'),
    extractMessages: (conversation) => ipcRenderer.invoke('extract-messages', conversation)
});
