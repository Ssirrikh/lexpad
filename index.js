
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

const tryParseJSON = (jsonStr) => {
	// https://stackoverflow.com/a/20392392
	try {
		const o = JSON.parse(jsonStr);
		if (o && typeof o === "object") return o;
	} catch (err) {
		console.error(`ERR File did not contain valid JSON. Unable to parse.`);
	}
	return null;
}

const demo_flipToggle = e => {
	demoToggle = !demoToggle;
	const webContents = e.sender;
	const win = BrowserWindow.fromWebContents(webContents);
	win.setTitle(demoToggle ? 'LexPad Toggled' : 'LexPad');
};
const openProject = async e => {
	console.log('main attempting to use "open file" dialogue')
	const webContents = e.sender;
	const win = BrowserWindow.fromWebContents(webContents);
	// "open file" dialogue
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties : ['openFile'],
		filters : [
			{ name: 'JSON', extensions: ['json'] },
			{ name: 'All Files', extensions: ['*'] },
		]
	});
	if (canceled || !filePaths?.length) return { canceled: true };
	// load selected file
	activeFile.path = filePaths[0];
	win.setTitle(activeFile.path);
	try {
		const raw = await fs.readFile(activeFile.path, 'utf8');
		activeFile.contents = tryParseJSON(raw);
		return activeFile.contents;
	} catch (err) {
		return { error: 'read_or_parse_failed', message: String(err) };
	}
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
	// ipcMain.on() does not expect reply (one-way comms)
	// ipcMain.handle() expects reply (two-way comms)

	// enable all IPC bridges
	ipcMain.on('flip-toggle', demo_flipToggle);
	ipcMain.handle('open-project', openProject);
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