const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
	flipToggle: () => ipcRenderer.send('flip-toggle'),
});