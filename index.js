
console.log('Hello from Electron');

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const isMac = process.platform === 'darwin';

const VERSION = 'v0.0';

const TAB_PROJECT = 0;
const TAB_LEXICON = 1;
const TAB_SEARCH = 2;

const TPL_NEW_PROJECT = `{
	"_WARNING" : "Save a backup of this project before mucking around in here! It will be annoying for everyone involved if you break something and have to call IT about it because you didn't save a backup.",
	"project" : {
		"lexpadVersion" : "${VERSION}",
		"activeEntry" : -1,
		"catgs" : {}
	},
	"language" : {
		"name" : "",
		"abbr" : "",
		"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
		"usesForms" : true,
		"forms" : {}
	},
	"lexicon" : []
}`;



//// PROGRAM STATE ////

// https://stackoverflow.com/questions/39574636/prompt-to-save-quit-before-closing-window

// Toolbox's New Project Flow:
	// (no check for unsaved changes, everything happens in new sub-window)
	// DIALOGUE choose directory to save in
	// [create folder if DNE]
	// PROMPT choose database format
	// [create empty project]
	// [save project]

// LexPad's New Project Flow:
	// [check unsaved changes]
	// MODAL New Project
		// LABEL Enter the name of your project file.
		// TEXTBOX filename
		// LABEL Select or create project directory. All project files will be stored here.
		// BUTTON -> DIALOGUE choose directory
		// LABEL Creating project in ...path/selectedDir
		// LABEL Main project file will be ...path/selectedDir/filename.json
		// ACTIONS [Create, Cancel]
	// [create folder if DNE]
	// [create empty project]
	// [save project]
	// [create assets directory]
	// [create project settings file]

// Open Project:
	// CHECK if (activeFile.isOpen && activeFile.modified) prompt to save project [Save Changes, Discard Changes, Cancel]
	// DIALOGUE open file
	// 

let activeFile = {
	// !isOpen => nothing is open
	// isOpen && path=='' => new project is open
	// isOpen && path!='' => existing project is open
	isOpen : false,
	path : '',
	modified : false,
};

// file selection
	// https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
	// Chromium Images: jpeg, webp, gif, png, apng, <canvas>/blob, bmp, ico
	// https://www.chromium.org/audio-video/
	// Chromium Audio Codecs: flac, mp3, opus, pcm, vorbis
	// => mp3, wav, ogg + mpeg, 3gp + mp4, adts, flac, webm
const SUPPORTED_IMAGES = ['bmp','jpeg','jpg','png','webp'];
const SUPPORTED_AUDIO = ['mp3','mpeg','ogg','wav'];
const onRendererSelectImages = async (evt) => {
	console.log('Renderer selects image file(s).')
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties : ['openFile','multiSelections'],
		filters : [
			{ name: 'Supported Images', extensions: SUPPORTED_IMAGES },
			// { name: 'Supported Images', extensions: ['bmp','jpeg','jpg','png','webp'] },
			{ name: 'All Files', extensions: ['*'] },
		]
	});
	if (canceled || !filePaths?.length) return { canceled: true };
	return { paths: filePaths };
};
const onRendererSelectAudio = async (evt) => {
	console.log('Renderer selects audio file(s).')
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties : ['openFile','multiSelections'],
		filters : [
			{ name: 'Supported Audio', extensions: SUPPORTED_AUDIO },
			// { name: 'Supported Audio', extensions: ['mp3','mpeg','ogg','wav'] },
			{ name: 'All Files', extensions: ['*'] },
		]
	});
	if (canceled || !filePaths?.length) return { canceled: true };
	return { paths: filePaths };
};
const onRendererSelectDirectory = async (evt) => {
	console.log('Renderer selects directory.')
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties : [
			'openDirectory',
			'createDirectory', // MAC: allow dialogue to create new directories
			// 'promptToCreate', // WINDOWS: allow selection of non-existant directory, which app will be expected to create
		],
		filters : [
			{ name: 'All Files', extensions: ['*'] },
		]
	});
	if (canceled || !filePaths?.length) return { canceled: true };
	return { path: filePaths[0] };
};

// mark modified
const onRendererMarkModified = () => {
	if (!activeFile.isOpen) { console.error('Renderer tries to mark project modified, but no project currently open.'); return; }
	activeFile.modified = true;
	console.log('Renderer marks project as modified.');
};
const markModified = (win) => {
	if (!win) { console.warn('Did not specify window to send signal to. Cannot mark project modified.'); return; };
	if (!activeFile.isOpen) { console.warn('No project currently open. Nothing to mark as modified.'); return; }
	if (!activeFile.modified) {
		console.log('Main marks project as modified.');
		activeFile.modified = true;
		win.webContents.send('main-mark-modified');
	}
};

// save project
const onRendererSaveProject = async (evt,contents) => {
	console.log('Renderer saves project. Received contents:');
	console.log(contents);
	// TODO: try write file to disk
	activeFile.modified = false;
	return { message : 'Project saved successfully.' }
};
const saveProject = (win) => {
	console.log('Main requests save project.');
	if (!win) { console.warn('Did not specify window to send signal to. Cannot save project.'); return; };
	if (!activeFile.isOpen) { console.warn('No project currently open. No changes to save.'); return; }
	if (!activeFile.modified) { console.warn('No changes to save.'); return; }
	win.webContents.send('main-save-project');
};

// create project
const onRendererCreateProject = async (evt,filepath,filename) => {
	// TODO: check validity of path
	// TODO: create relevant files/directories
	console.log(`Renderer creates project in "${filepath}".`);
	console.log(`Created project file "${filepath}\\${filename}.json".`);
	console.log(`Created assets folder "${filepath}\\assets".`);
	return { message : 'Project created successfully.' };
};
const createProject = (win) => {
	console.log('Main requests create new project.');
	if (!win) { console.warn('Did not specify window to send signal to. Cannot create project.'); return; };
	win.webContents.send('main-create-project');
};

// open project
const onRendererOpenProject = async (evt) => {
	console.log('Renderer opens project.')
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
const openProject = (win) => {
	console.log('Main requests open project.');
	if (!win) { console.warn('Did not specify window to send signal to. Cannot open project.'); return; };
	win.webContents.send('main-open-project');
};



// tutorials
const openKeyboardShortcutReference = (win) => {
	console.log('Main requests open keyboard shortcut reference.');
	if (!win) { console.warn('Did not specify window to send signal to. Cannot open keyboard shortcut reference.'); return; };
	win.webContents.send('main-open-keyboard-shortcuts');
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

const newProject = async e => {
	console.log('Main creating new project');
};

const onRendererLoadProject = async (e,filepath) => {
	console.log(`Renderer loads project "${filepath}"`);
	try {
		const raw = await fs.readFile(filepath, 'utf8');
		activeFile.isOpen = true;
		activeFile.path = filepath;
		activeFile.modified = false;
		console.log('Main successfully reads project file.');
		return { path: filepath, json: raw };
	} catch (err) {
		return { error: 'read_or_parse_failed', message: String(err) };
	}
};
const listMedia = async (e,filepath) => {
	const dirPath = path.dirname(filepath);
	console.log(`Detecting media in "${dirPath}\\assets"...`);
	try {
		const files = await fs.readdir(path.join(dirPath,'assets'), {recursive:true});
		console.log(`Discovered ${files.length} files in "${dirPath}\\assets".`);
		// console.log(files);
		console.log(files.map(f => `assets\\${f}`));
		return { path: filepath, media: files.map(f => `assets/${f}`) };
	} catch (err) {
		return { error: 'cannot_read_directory', message: String(err) };
	}
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
		// useContentSize : true,
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
					click : () => createProject(win)
				},
				{
					label : 'Open Project',
					accelerator : 'CmdOrCtrl+O',
					click : () => openProject(win)
				},
				{
					label : 'Save',
					accelerator : 'CmdOrCtrl+S',
					click : () => saveProject(win)
				},
				{
					label : 'Save As',
					accelerator : 'CmdOrCtrl+Shift+S',
					click : () => {
						console.log('Trigger save copy of project...');
						if (activeFile.isOpen) {
							// save project as
							activeFile.modified = false;
							console.log('PROMPT Save As');
						}
					}
				},
				{
					label : 'DBG Mark Modified',
					accelerator : 'CmdOrCtrl+M',
					click : () => markModified(win)
				},
				{ type: 'separator' },
				// {
				// 	label : 'Run Auto-Cleanup Script',
				// 	click : () => console.log('Trigger auto-cleanup script...')
				// },
				{
					label : 'LexPad Settings',
					accelerator : 'CmdOrCtrl+,',
					click : () => console.log('Trigger open LexPad settings tab...')
				},
				{ type: 'separator' },
				{
					label : 'Close Project',
					accelerator : 'CmdOrCtrl+W',
					click : () => console.log('Trigger close project...')
				},
				// Non-Mac Quit Option (Ctrl+Q)
				...(isMac ? [] : [{
					role : 'quit',
					accelerator : 'CmdOrCtrl+Q'
					// TODO: check for unsaved changes
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
				{ role: 'zoomIn', accelerator : 'CmdOrCtrl+=' }, // Ctrl+=
				{ role: 'zoomOut' }, // Ctrl+-
				{ role: 'resetZoom', label : 'Reset Zoom' }, // Ctrl+0
				{ type: 'separator' },
				{ role: 'togglefullscreen' } // F11
			]
		},
		// Window { role: 'windowMenu' }
		{
			label : 'Window',
			submenu : [
				{
					label : 'Project Tab',
					accelerator : 'CmdOrCtrl+1',
					click : () => {
						console.log(`Trigger tab ${TAB_PROJECT}`);
						win.webContents.send('trigger-tab', TAB_PROJECT);
					}
				},
				{
					label : 'Lexicon Tab',
					accelerator : 'CmdOrCtrl+2',
					click : () => win.webContents.send('trigger-tab', TAB_LEXICON)
				},
				{
					label : 'Search Tab',
					accelerator : 'CmdOrCtrl+3',
					click : () => win.webContents.send('trigger-tab', TAB_SEARCH)
				},
				{ type: 'separator' },
				{
					role : 'forceReload' // Force Reload 'CmdOrCtrl+Shift+R
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
					click : () => console.log('Open offline quick start guide (window? pdf? modal?)...')
				},
				{
					label : 'Documentation',
					submenu : [
						{
							label : 'Offline PDF',
							click : () => console.log('Open documentation PDF...')
						},
						{
							label : 'Online Documentation',
							click : () => console.log('Open documentation website...')
						}
					]
				},
				{
					label : 'Keyboard Shortcut Reference',
					accelerator : 'CmdOrCtrl+K',
					click : () => openKeyboardShortcutReference(win)
				},
				{ type: 'separator' },
				{
					label : 'Report a Bug',
					click : () => console.log('Opening GitHub bug report page...')
				},
				{ type: 'separator' },
				{
					label : 'Check for Updates',
					click : () => console.log('Open GitHub newest verion page...')
				},
				{
					label : 'Visit LexPad GitHub',
					click : async () => {
						console.log('Open GitHub main page...');
						await shell.openExternal('https://github.com/ssirrikh/lexpad?tab=readme-ov-file#lexpad')
					}
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

	// 
	ipcMain.handle('renderer-select-directory', onRendererSelectDirectory);
	ipcMain.handle('renderer-select-images', onRendererSelectImages);
	ipcMain.handle('renderer-select-audio', onRendererSelectAudio);

	//
	ipcMain.on('renderer-mark-modified', onRendererMarkModified);
	ipcMain.handle('renderer-save-project', onRendererSaveProject);
	ipcMain.handle('renderer-create-project', onRendererCreateProject);
	ipcMain.handle('renderer-open-project', onRendererOpenProject);
	ipcMain.handle('renderer-load-project', onRendererLoadProject);

	// IPC bridges: I/O
	// ipcMain.on('trigger-create-project', )
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