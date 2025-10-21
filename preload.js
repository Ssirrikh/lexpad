const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
	// use ipcRenderer.send() for ipcMain.on() one-way comms
	// use ipcRenderer.invoke() for ipcMain.handle() two-way comms
	
	flipToggle: () => ipcRenderer.send('flip-toggle'),
	openProject: () => ipcRenderer.invoke('open-project'),
});