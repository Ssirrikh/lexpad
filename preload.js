const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
	// ipcRenderer.send() for ipcMain.on() one-way comms
	// ipcRenderer.invoke() for ipcMain.handle() two-way comms
	
	// // debug
	// flipToggle: () => ipcRenderer.send('dbg-flip-toggle'),
	// requestObject: () => ipcRenderer.invoke('dbg-request-object'),
	// checkObject: () => ipcRenderer.send('dbg-check-object'),

	// Main-to-Renderer signals
	onTriggerTab : (callback) => ipcRenderer.on('trigger-tab', (evt,tabId) => callback(tabId)),

	// Project State, File I/O

	//
	rendererSelectDirectory : () => ipcRenderer.invoke('renderer-select-directory'),
	rendererSelectImages : () => ipcRenderer.invoke('renderer-select-images'),
	rendererSelectAudio : () => ipcRenderer.invoke('renderer-select-audio'),

	// mark modified
	onMainMarkModified : (callback) => ipcRenderer.on('main-mark-modified', (evt) => callback()),
	rendererMarkModified : () => ipcRenderer.send('renderer-mark-modified'),
	// save project
	onMainSaveProject : (callback) => ipcRenderer.on('main-save-project', (evt) => callback()),
	rendererSaveProject : (contents) => ipcRenderer.invoke('renderer-save-project', contents),
	// new project
	onMainCreateProject : (callback) => ipcRenderer.on('main-create-project', (evt) => callback()),
	// onTriggerCreateProject : (callback) => ipcRenderer.on('trigger-create-project', (evt) => callback()),
	rendererCreateProject : (filepath,filename) => ipcRenderer.invoke('renderer-create-project', filepath, filename),
	// open project
	onMainOpenProject : (callback) => ipcRenderer.on('main-open-project', (evt) => callback()),
	rendererOpenProject : () => ipcRenderer.invoke('renderer-open-project'),
	rendererLoadProject : (path) => ipcRenderer.invoke('renderer-load-project', path),
	
	// I/O
	listMedia : (path) => ipcRenderer.invoke('list-media', path),

	// Tutorials
	onMainOpenKeyboardShortcuts : (callback) => ipcRenderer.on('main-open-keyboard-shortcuts', (evt) => callback()),

	// database access
	// getLangInfo : () => ipcRenderer.invoke('get-lang-info'),
	// getOrderedWords : () => ipcRenderer.invoke('get-ordered-words'),
	// getEntry : (entryId) => ipcRenderer.invoke('get-entry', entryId),
});