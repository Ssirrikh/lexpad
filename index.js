
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

let L1 = {
	"name" : "English",
	"abbr" : "eng",
	"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
	"usesForms" : false
};
let L2 = {};

let lexicon = {
	data : [],
	orderedL1 : [],
	orderedL2 : []
};

// formNum is index of form within entry's array of forms
// formId is linguist label corresponding to case/conjugation/etc
class LexiconEntry {
	constructor () {
		this.catg = undefined;
		this.L1 = [];
		this.L2 = [];
		this.sentences = [];
		this.sentenceAnnotation = [];
		this.notes = [];
	}
	// data interaction
	addFormL1 (word, form = -1) { this.L1.push(word.split(SYNONYM_SPLITTER)); }
	addFormL2 (word, form = -1) { this.L2.push(L2.usesForms ? {synonyms:word.split(SYNONYM_SPLITTER),formId:form} : {synonyms:word.split(SYNONYM_SPLITTER)}); }
	addSentence (L1, L2, form = -1) { this.sentences.push(L2.usesForms ? {L1:L1,L2:L2,form:form} : {L1:L1,L2:L2}); }
	addNote (note) { this.notes.push(note); }
	// lookup
	hasFormL1 (word) {}
	hasFormL2 (word) {}
	// TODO: account for 
	// hasFormL1 (word) { word=word.toLowerCase(); return this.L1.flat().some(x => (x.synonyms ?? x) o.word.toLowerCase()===word); }
	// hasFormL2 (word) { word=word.toLowerCase(); return this.L2.flat().some(o => o.word.toLowerCase()===word); }
	getFormL1 (formNum = 0) {}
	getFormL2 (formNum = 0) {}
	getSentence (sentNum = 0) {}
	getSynonymIdL1 (word) {}
	getSynonymIdL2 (word) {}
	// annotation
	annotateSentences () {}
	// loops
	forEachFormL1 (callback = (synonyms,formId,formNum)=>{}) {
		for (let formNum = 0; formNum < this.L1.length; formNum++) {
			callback(this.L1[formNum].synonyms,this.L1[formNum].formId,formNum);
		}
	}
}

const populateLexicon = jsonParse => {
	if (!jsonParse.lexicon) {
		console.error(`JSON parse did not contain a valid lexicon.`);
		return;
	}
	// language data
	L2 = {
		name : jsonParse.language.name ?? `Unnamed Language`,
		abbr : jsonParse.language.abbr ?? `lang`,
		alph : jsonParse.language.alph ?? L1.alph,
		usesForms : jsonParse.language.usesForms ?? false,
		forms : {},
		catgs : {}
	}
	for (let form in jsonParse.language.forms) {
		L2.forms[form] = jsonParse.language.forms[form].map(x => x);
	}
	for (let catg in jsonParse.language.catgs) {
		L2.catgs[catg] = jsonParse.language.catgs[catg];
	}
	// lexicon
	let entry;
	for (let i = 0; i < jsonParse.lexicon.length; i++) {
		entry = jsonParse.lexicon[i];
		// construct lexicon
		let e = new LexiconEntry();
		e.addFormL1(entry.L1);
		e.catg = entry.catg;
		for (let form of entry.L2) e.addFormL2(form.L2, form.form);
		for (let sent of entry.sents) e.addSentence(sent.L1, sent.L2, sent.form);
		for (let note of entry.notes) e.addNote(note);
		lexicon.data.push(e);
		// index data
		lexicon.orderedL1.push(...entry.L1.split(SYNONYM_SPLITTER).map(w => {return {word:w,entryId:i}}));
		for (let form of entry.L2) lexicon.orderedL2.push(...form.L2.split(SYNONYM_SPLITTER).map(w => {return {word:w,entryId:i}}));
	}
	console.log(`Loaded ${jsonParse.lexicon.length} entries into lexicon.`);
	console.log(`${lexicon.orderedL1.length} L1 synonyms searchable, ${lexicon.orderedL2.length} L2 synonyms searchable`);
	console.log(lexicon.orderedL1);
	console.log(lexicon.orderedL2);
}

const getLanguageInfo = () => {
	return {
		L1 : L1,
		L2 : L2
	};
};
const getOrderedWords = () => {
	return {
		L1 : lexicon.orderedL1,
		L2 : lexicon.orderedL2
	};
};
const getEntry = entryId => {
	return lexicon.data[entryId] ?? { error: `index_out_of_bounds` };
}



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
		console.log(activeFile.contents);
		if (activeFile.contents) {
			populateLexicon(activeFile.contents);
		}
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
		// fullscreen: true,
		// frame: false,
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

	// IPC bridges: debug
	ipcMain.on('dbg-flip-toggle', dbg_flipToggle);
	ipcMain.handle('dbg-request-object',dbg_requestObject);
	ipcMain.on('dbg-check-object', dbg_checkObject);
	// IPC bridges: I/O
	ipcMain.handle('open-project', openProject);
	// IPC bridges: database access
	ipcMain.handle('get-lang-info', getLanguageInfo);
	ipcMain.handle('get-ordered-words', getOrderedWords);
	ipcMain.handle('get-entry', getEntry);

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