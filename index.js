
console.log('Hello from Electron');

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const isMac = process.platform === 'darwin';



//// PROGRAM STATE ////

// let demoToggle = false;
// let demoObject = {
// 	v : 7
// };
let activeFile = {
	path : '',
	contents : {},
	modified : false,
};



//// APP COMPONENTS ////

	



//// I/O ////

// const dbg_flipToggle = e => {
// 	demoToggle = !demoToggle;
// 	const webContents = e.sender;
// 	const win = BrowserWindow.fromWebContents(webContents);
// 	win.setTitle(demoToggle ? 'LexPad Toggled' : 'LexPad');
// };
// const dbg_requestObject = e => {
// 	return demoObject;
// }
// const dbg_checkObject = e => {
// 	console.log(demoObject);
// }

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
	// create app window
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

	// create app menu (must be attached in createWindow() so keyboard shortcuts can trigger main->renderer IPC)
	const tplAppMenu = [
		// Apple-only App Menu { role: 'appMenu' }
		...(!isMac ? [] : [{
			label : app.name,
			submenu : [
				{ role: 'about' },
				{ type: 'separator' },
				{ role: 'services' },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ role: 'unhide' },
				{ type: 'separator' },
				{ role: 'quit' }
			]
		}]),
		// File { role: 'fileMenu' }
		{
			label : 'File',
			submenu : [
				{
					label : 'New Project',
					accelerator : 'CmdOrCtrl+N',
					onclick : () => console.log('Trigger create new project...')
				},
				{
					label : 'Open Project',
					accelerator : 'CmdOrCtrl+O',
					onclick : () => console.log('Trigger open project...')
				},
				{
					label : 'Save',
					accelerator : 'CmdOrCtrl+S',
					onclick : () => console.log('Trigger save project...')
				},
				{
					label : 'Save As',
					accelerator : 'CmdOrCtrl+Shift+S',
					onclick : () => console.log('Trigger save copy of project as...')
				},
				{ type: 'separator' },
				// {
				// 	label : 'Run Auto-Cleanup Script',
				// 	onclick : () => console.log('Trigger auto-cleanup script...')
				// },
				{
					label : 'LexPad Settings',
					accelerator : 'CmdOrCtrl+,',
					onclick : () => console.log('Trigger open LexPad settings tab...')
				},
				{ type: 'separator' },
				{
					label : 'Close Project',
					accelerator : 'CmdOrCtrl+W',
					onclick : () => console.log('Trigger close project...')
				},
				// Non-Mac Quit Option (Ctrl+Q)
				...(isMac ? [] : [{
					role : 'quit',
					accelerator : 'CmdOrCtrl+Q'
				}])
			]
		},
		// Edit { role: 'editMenu' }
		{
			label : 'Edit',
			submenu : [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				...(!isMac ? [] : [{ role : 'pasteAndMatchStyle' }]), // Mac-only Paste-and-Match-Style
				{ role: 'delete', accelerator : 'Delete' },
				{ type: 'separator' },
				{ role: 'selectAll' }
				// -----
				// - Find [Ctrl F]
				// - Replace [Ctrl H]
			]
		},
		// View { role: 'viewMenu' }
		{
			label : 'View',
			submenu : [
				{ role: 'zoomIn', accelerator : 'CmdOrCtrl+=' },
				{ role: 'zoomOut' },
				{ role: 'resetZoom', label : 'Reset Zoom' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' }
				// { role: 'togglefullscreen', accelerator : 'F11' }
			]
		},
		// Window { role: 'windowMenu' }
		{
			label : 'Window',
			submenu : [
				{
					label : 'Project Tab',
					accelerator : 'CmdOrCtrl+1',
					onclick : () => console.log('Trigger renderTab(TAB_PROJECT)...')
				},
				{
					label : 'Lexicon Tab',
					accelerator : 'CmdOrCtrl+2',
					onclick : () => console.log('Trigger renderTab(TAB_LEXICON)...')
				},
				{
					label : 'Search Tab',
					accelerator : 'CmdOrCtrl+3',
					onclick : () => console.log('Trigger renderTab(TAB_SEARCH)...')
				},
				{ type: 'separator' },
				{
					// role : 'toggleDevTools',
					// label : 'Developer Tools',
					// accelerator : 'F12'
					role : 'forceReload'
				},
				{
					role : 'toggleDevTools',
					label : 'Developer Tools',
					accelerator : 'F12'
				}
			]
		},
		// Help
		{
			label : 'Help',
			submenu : [
				{
					label : 'Quick Start Guide',
					onclick : () => console.log('Open offline quick start guide (window? pdf? modal?)...')
				},
				{
					label : 'Documentation',
					submenu : [
						{
							label : 'Offline PDF',
							onclick : () => console.log('Open documentation PDF...')
						},
						{
							label : 'Online Documentation',
							onclick : () => console.log('Open documentation website...')
						}
					]
				},
				{
					label : 'Keyboard Shortcut Reference',
					accelerator : 'CmdOrCtrl+K',
					onclick : () => console.log('Open keyboard shortcut list (or settings page?)...')
				},
				{ type: 'separator' },
				{
					label : 'Report a Bug',
					onclick : () => console.log('Opening GitHub bug report page...')
				},
				{ type: 'separator' },
				{
					label : 'Check for Updates',
					onclick : () => console.log('Open GitHub newest verion page...')
				},
				{
					label : 'Visit LexPad GitHub',
					onclick : () => console.log('Open GitHub main page...')
				}
			]
		}

		// // role:'help' enables searchbar on Mac instead of dropdown
		// {
		// 	role : 'help',
		// 	submenu : []
		// }
	];
	const appMenu = Menu.buildFromTemplate(tplAppMenu);
	Menu.setApplicationMenu(appMenu);

	// render app
	win.loadFile('lexpad.html');
	// win.openDevTools();
};

// init app
app.whenReady().then(() => {
	// ipcMain.on() does not expect reply (one-way comms)
	// ipcMain.handle() expects reply (two-way comms)

	// // IPC bridges: debug
	// ipcMain.on('dbg-flip-toggle', dbg_flipToggle);
	// ipcMain.handle('dbg-request-object',dbg_requestObject);
	// ipcMain.on('dbg-check-object', dbg_checkObject);
	// IPC bridges: I/O
	ipcMain.handle('open-project', openProject);
	ipcMain.handle('load-project', loadProject);
	ipcMain.handle('list-media', listMedia);

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