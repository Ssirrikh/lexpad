const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
	// ipcRenderer.send() for ipcMain.on() one-way comms
	// ipcRenderer.invoke() for ipcMain.handle() two-way comms
	
	// debug
	flipToggle: () => ipcRenderer.send('dbg-flip-toggle'),
	requestObject: () => ipcRenderer.invoke('dbg-request-object'),
	checkObject: () => ipcRenderer.send('dbg-check-object'),
	
	// I/O
	openProject: () => ipcRenderer.invoke('open-project'),
	loadProject : (path) => ipcRenderer.invoke('load-project', path),
	// database access
	getLangInfo : () => ipcRenderer.invoke('get-lang-info'),
	getOrderedWords : () => ipcRenderer.invoke('get-ordered-words'),
	getEntry : (entryId) => ipcRenderer.invoke('get-entry', entryId),
});