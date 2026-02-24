const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
	// ipcRenderer.send() for ipcMain.on() one-way comms
	// ipcRenderer.invoke() for ipcMain.handle() two-way comms

	// Main-to-Renderer signals
	onTriggerTab : (callback) => ipcRenderer.on('trigger-tab', (evt,tabId) => callback(tabId)),

	// Renderer-to-Main signals
	rendererOpenLexPadGithub : () => ipcRenderer.invoke('renderer-open-github'),

	// Project State, File I/O

	// file selection
	rendererSelectDirectory : () => ipcRenderer.invoke('renderer-select-directory'),
	rendererSelectImages : () => ipcRenderer.invoke('renderer-select-images'),
	rendererSelectAudio : () => ipcRenderer.invoke('renderer-select-audio'),

	// file creation
	rendererExportTextFile : (contents) => ipcRenderer.invoke('renderer-export-text-file',contents),

	// mark modified
	onMainMarkModified : (callback) => ipcRenderer.on('main-mark-modified', (evt) => callback()),
	rendererMarkModified : () => ipcRenderer.send('renderer-mark-modified'),
	// save project
	onMainSaveProject : (callback) => ipcRenderer.on('main-save-project', (evt) => callback()),
	rendererSaveProject : (contents) => ipcRenderer.invoke('renderer-save-project', contents),
	onMainSaveProjectAs : (callback) => ipcRenderer.on('main-save-project-as', (evt) => callback()),
	rendererSaveProjectAs : (contents) => ipcRenderer.invoke('renderer-save-project-as', contents),
	// new project
	onMainCreateProject : (callback) => ipcRenderer.on('main-create-project', (evt) => callback()),
	rendererCreateProject : (filepath,filename) => ipcRenderer.invoke('renderer-create-project', filepath, filename),
	// open project
	onMainOpenProject : (callback) => ipcRenderer.on('main-open-project', (evt) => callback()),
	rendererOpenProject : () => ipcRenderer.invoke('renderer-open-project'),
	rendererLoadProject : (path) => ipcRenderer.invoke('renderer-load-project', path),
	
	// I/O
	listMedia : (path) => ipcRenderer.invoke('list-media', path),

	// Tutorials
	onMainOpenKeyboardShortcuts : (callback) => ipcRenderer.on('main-open-keyboard-shortcuts', (evt) => callback()),
});