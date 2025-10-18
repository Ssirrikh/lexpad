
console.log('Hello from Electron');

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');



//// PROGRAM STATE ////

let demoToggle = false;
let activeFile = {
	path : '',
	contents : {},
	modified : false,
};



//// I/O ////

const demo_flipToggle = e => {
	demoToggle = !demoToggle;
	const webContents = e.sender;
	const win = BrowserWindow.fromWebContents(webContents);
	win.setTitle(demoToggle ? 'LexPad Toggled' : 'LexPad');
};
const openProject = () => {
	// TODO: open file dialogue
};
const saveProject = () => {
	// TODO: save file dialogue
};



//// WINDOW ////

const createWindow = () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
    		preload: path.join(__dirname, 'preload.js')
    	},
	});

	win.openDevTools();

	win.loadFile('lexpad.html');
};

// init app
app.whenReady().then(() => {
	// enable all IPC bridges
	ipcMain.on('flip-toggle', demo_flipToggle);
	// open main app window
	createWindow();
	// on osx, activating an unclosed app that has no windows should open a new window
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// on windows/linux, closing all windows should close the entire app
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});