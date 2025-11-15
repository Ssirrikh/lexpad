
console.log('Hello from Electron');

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');



//// PROGRAM STATE ////

let demoToggle = false;
let demoObject = {
	v : 7
};
let activeFile = {
	path : '',
	contents : {},
	modified : false,
};



//// DICTIONARY MANAGEMENT ////

const SYNONYM_SPLITTER = '; ';



//// I/O ////

const dbg_flipToggle = e => {
	demoToggle = !demoToggle;
	const webContents = e.sender;
	const win = BrowserWindow.fromWebContents(webContents);
	win.setTitle(demoToggle ? 'LexPad Toggled' : 'LexPad');
};
const dbg_requestObject = e => {
	return demoObject;
}
const dbg_checkObject = e => {
	console.log(demoObject);
}

const openProject = async e => {
	console.log('main attempting to use "open file" dialogue')
	// const webContents = e.sender;
	// const win = BrowserWindow.fromWebContents(webContents);
	// "open file" dialogue
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties : ['openFile'],
		filters : [
			{ name: 'JSON', extensions: ['json'] },
			{ name: 'All Files', extensions: ['*'] },
		]
	});
	if (canceled || !filePaths?.length) return { canceled: true };
	return { path: filePaths[0] };
};
const loadProject = async (e,filepath) => {
	console.log(filepath);
	try {
		const raw = await fs.readFile(filepath, 'utf8');

		// const dirPath = path.dirname(filepath);
		// console.log(`Detecting media in ${dirPath}/assets`);
		// const files = await fs.readdir(path.join(dirPath,'assets'), {recursive:true});
		// console.log(files);
		// console.log(files.map(f => `assets/${f}`));
		// // TODO: handle directory does not exist

		return { path: filepath, json: raw };
	} catch (err) {
		return { error: 'read_or_parse_failed', message: String(err) };
	}
};
const listMedia = async (e,filepath) => {
	const dirPath = path.dirname(filepath);
	console.log(`Detecting media in ${dirPath}/assets`);
	try {
		const files = await fs.readdir(path.join(dirPath,'assets'), {recursive:true});
		console.log(files);
		console.log(files.map(f => `assets/${f}`));
		return { path: filepath, media: files.map(f => `assets/${f}`) };
	} catch (err) {
		return { error: 'cannot_read_directory', message: String(err) };
	}
};
const saveProject = () => {
	// TODO: save file dialogue
};



//// WINDOW ////

const createWindow = () => {
	const win = new BrowserWindow({
		// discord uses 1325 x 885 default size
		// electron has a max height 825 on a 1920x1080 screen
		width: 1300,
		height: 800,
		// fullscreen: true,
		// frame: false,
		webPreferences: {
    		preload: path.join(__dirname, 'preload.js')
    	},
	});

	// win.openDevTools();

	win.loadFile('lexpad.html');
};

// init app
app.whenReady().then(() => {
	// ipcMain.on() does not expect reply (one-way comms)
	// ipcMain.handle() expects reply (two-way comms)

	// IPC bridges: debug
	ipcMain.on('dbg-flip-toggle', dbg_flipToggle);
	ipcMain.handle('dbg-request-object',dbg_requestObject);
	ipcMain.on('dbg-check-object', dbg_checkObject);
	// IPC bridges: I/O
	ipcMain.handle('open-project', openProject);
	ipcMain.handle('load-project', loadProject);
	ipcMain.handle('list-media', listMedia);
	// IPC bridges: database access
	// ipcMain.handle('get-lang-info', getLanguageInfo);
	// ipcMain.handle('get-ordered-words', getOrderedWords);
	// ipcMain.handle('get-entry', getEntry);

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