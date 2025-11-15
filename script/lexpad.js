
console.log(`Inline JS running successfully.`);

import * as lexicon from "./dictionary.js";
import { file, project } from "./dictionary.js";

// lexicon.checkObj(); // initial val 7
// lexicon.myObj.x = 99;
// lexicon.checkObj(); // modded property 99
// lexicon.replaceObj(); // sets to 111
// lexicon.checkObj(); // complete obj replacement 111

// TODO: IPC/security is adding too much complexity for early stages
	// pipe entire JSON object to dictionary.js
	// do all indexing/sorting/etc there
	// lexpad.js uses dictionary.js API to selectively request data
		// defend against accidental user bungles, but assume API is safe
		// add scrubbing to dictionary.js later down the pipeline

const RE_SYNONYM_SPLITTER = /;\s*/;

const TAB_PROJECT = 0;
const TAB_LEXICON = 1;
const TAB_SEARCH = 2;

const capitalize = s => (s[0]??'').toUpperCase() + s.slice(1);


//// media.js ////

// loadable media
let mediaMissing = []; // media that was referenced but not found
let mediaUnused = []; // media that was found but never used
// lexicon.media contains all media files referenced in 

let audioPlayer = {
	player : document.createElement('audio'),
	projectPath : '',
	play : (src) => {
		console.log(`Playing audio "${audioPlayer.projectPath}/${src}"`);
		audioPlayer.player.pause();
		audioPlayer.player.src = `${audioPlayer.projectPath}/${src}`;
		audioPlayer.player.play();
	}
};






////////////////////////////////////////////////////////////////////

//// PROGRAM STATE ////

// let tabNeedsUpdate = [
//     false, // project tab
//     false, // lexicon tab
//     false, // search tab
// ];
// active entry
let activeEntry = {};
let activeMenu = ''; // id of DOM element


//// DOM ////

// static content anchors
const eNavTabs = [
	document.getElementById('navtab-0'),
	document.getElementById('navtab-1'),
	document.getElementById('navtab-2')
];
const eStatbarLeft = document.getElementById('statbar-left');
const eStatbarRight = document.getElementById('statbar-right');
// dynamic content anchors
let activeElement = document.getElementById('r-content');
// off-DOM content
let nWelcomePage;
let tabContent = [
	// project tab
	// lexicon tab
	// search tab
];



////////////////////////////////////////////////////////////////////////

//// DYNAMIC ELEMENT CONSTRUCTION ////

/*
PROGRAM FLOW:

INIT
	-> RENDER welcome page
	-> BG-RENDER project tab
	-> BG-RENDER lexicon tab
	-> BG-RENDER search tab
	-> WAIT

USER "open project"
	-> USER file select
	//-> RENDER project tab loading screen
	-> LOAD lang data
	-> RENDER project tab
	-> BG-RENDER lexicon tab loading screen
		-> LOAD lexicon data (ordered words)
		-> RENDER lexicon
		-> LOAD active entry
		-> RENDER entry editor
	-> BG-RENDER search tab loading screen
		-> RENDER [stub]
	-> WAIT
*/

const init = () => {
	const t0_init = performance.now();
	// construct welcome page
	nWelcomePage = document.getElementById('tpl-welcome-page').content.firstElementChild.cloneNode(true);
	nWelcomePage.querySelector('#btn-open-project').onclick = async () => await tryOpenProject(); // needs to be lambda, so function can be hoisted properly
	// allow page to render, then build content skeletons off-DOM
	renderWelcomePage();
	requestAnimationFrame(() => {
		const t0_init_deferred = performance.now();
		// project tab
		tabContent[TAB_PROJECT] = document.getElementById('tpl-project-page').content.firstElementChild.cloneNode(true);
		// lexicon tab
		tabContent[TAB_LEXICON] = document.getElementById('tpl-lexicon-page').content.firstElementChild.cloneNode(true);
		tabContent[TAB_LEXICON].style.padding = '0';
		tabContent[TAB_LEXICON].querySelector('#entry-editor').innerHTML = '';
		tabContent[TAB_LEXICON].querySelector('#entry-editor').appendChild( document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true) );
		tabContent[TAB_LEXICON].querySelector('#entry-editor .window-status p').textContent = 'Load an entry to get started';
		// search tab
		tabContent[TAB_SEARCH] = document.getElementById('tpl-search-page').content.firstElementChild.cloneNode(true);
		tabContent[TAB_SEARCH].innerHTML = '';
		tabContent[TAB_SEARCH].appendChild( document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true) );
		tabContent[TAB_SEARCH].querySelector('.window-status p').textContent = 'Search tab under construction';
		// enable tab switching
		eNavTabs[TAB_PROJECT].onclick = () => renderTab(TAB_PROJECT);
		eNavTabs[TAB_LEXICON].onclick = () => renderTab(TAB_LEXICON);
		eNavTabs[TAB_SEARCH].onclick = () => renderTab(TAB_SEARCH);
		console.log(`Application interactive after ${Math.round(performance.now()-t0_init)} ms. Deferred operations took ${Math.round(performance.now()-t0_init_deferred)} ms.`);
	});
};

const renderWelcomePage = () => {
	activeElement.replaceWith( nWelcomePage );
	activeElement = document.getElementById('r-content'); // rebind to active content
};
const renderTab = (tabId) => {
	// disable tab switching if no project is open
	if (!file.path) {
		console.warn('No project loaded.');
		return false;
	}
	// check if content exists
	if (!eNavTabs[tabId]) {
		console.warn(`No tab exists with id ${tabId}.`);
		return false;
	}
	if (!tabContent[tabId]) {
		console.warn(`No content exists for Tab ${tabId}`);
		return false;
	}
	// update navbar
	for (let i = 0; i < eNavTabs.length; i++) {
		if (i === tabId && !eNavTabs[i].classList.contains('active-navtab')) {
			eNavTabs[i].classList.add('active-navtab');
		} else if (i !== tabId && eNavTabs[i].classList.contains('active-navtab')) {
			eNavTabs[i].classList.remove('active-navtab');
		}
	}
	// update content
	activeElement.replaceWith(tabContent[tabId]);
	activeElement = document.getElementById('r-content'); // rebind var to active container
	
	// if (tabNeedsUpdate[tabId]) {
	//     // TODO: run appropriate update function(s)
	// }

	return true;
};
const buildFormSelect = (catg) => {
	console.log(`Building form selector for catg "${catg}"...`);
	// if target catg not encountered before, create it
	if (!lexicon.L2.forms[catg]) lexicon.L2.forms[catg] = [];
	// rebuild form select template for target catg
	let eStr = ``;
	eStr += `<select>`;
		eStr += `<option value='-1'>-- Select Option --</option>`;
		for (let i = 0; i < lexicon.L2.forms[catg].length; i++) eStr += `<option value='${i}'>${lexicon.L2.forms[catg][i]}</option>`;
		eStr += `<option value='+'>++ ADD NEW ++</option>`;
	eStr += `</select>`;
	// TODO: UNSAFE innerHTML with arbitrary input
	// setting innerHTML seems to be the only way to mod a template; it's all or nothing
	// need to clean this
	document.querySelector('#tpl-form-select').innerHTML = eStr;
};

// project tab
const populateQuickCopyBar = () => {
	// console.log(lexicon.L2);
	eStatbarLeft.innerHTML = '<p>Click to copy:</p>';
	let englishAlphabet = lexicon.L1.alph.split(' ');
	let alphabet = lexicon.L2.alph.split(' ');
	// console.log(alphabet);
	for (let letter of alphabet) {
		// console.log(letter, englishAlphabet.indexOf(letter));
		if (englishAlphabet.indexOf(letter) !== -1) continue;
		let e = document.createElement('button');
		Object.assign(e, {
			className : 'quick-copy-letter',
			textContent : letter,
			onclick : () => {
				navigator.clipboard.writeText(letter);
				console.log(`Copied "${letter}" to clipboard.`);
			}
		});
		eStatbarLeft.appendChild(e);
	}
};
const populateProjectTab = () => {
	tabContent[TAB_PROJECT].querySelector('#lang-name').value = lexicon.L2.name ?? '';
	tabContent[TAB_PROJECT].querySelector('#lang-abbr').value = lexicon.L2.abbr ?? '';
	// TODO: add onblur updaters for other fields
	tabContent[TAB_PROJECT].querySelector('#lang-alph').value = lexicon.L2.alph ?? '';
	tabContent[TAB_PROJECT].querySelector('#lang-alph').onblur = () => {
		lexicon.L2.alph = tabContent[TAB_PROJECT].querySelector('#lang-alph').value.split(/\s+/).join(' ');
		console.log(lexicon.L2.alph);
		populateQuickCopyBar();
	};
};

// lexicon tab
const populateLexicon = () => {
	const t0_buildLexicon = performance.now();
	const eLexicon = tabContent[TAB_LEXICON].querySelector('#lexicon-content');
	eLexicon.innerHTML = '';
	for (let i = 0; i < lexicon.orderedL1.length; i++) {
		let e = document.getElementById('tpl-lexicon-entry').content.firstElementChild.cloneNode(true);
		Object.assign(e, {
			id : `lexicon-entry-${i}`,
			onclick : async () => {
				console.log(`Clicked item ${i}. Loading entry ${lexicon.orderedL1[i].entryId}...`);
				await tryLoadEntry(lexicon.orderedL1[i].entryId);
			}
		});
		// console.log(`${lexicon.orderedL1[i].entryId} (${project.activeEntry})`);
		if (project.activeEntry === lexicon.orderedL1[i].entryId) e.classList.add('active-entry');
		e.querySelector('.lexicon-entry-catg').textContent = capitalize(lexicon.orderedL1[i].catg) || '---';
		e.querySelector('.lexicon-entry-word').textContent = lexicon.orderedL1[i].word || '---';
		eLexicon.appendChild(e);
	}
	const eNoResults = document.createElement('p');
	Object.assign(eNoResults, {
		id : `lexicon-no-entries`,
		textContent : `No results...`
	});
	eNoResults.style.display = 'none';
	eLexicon.appendChild(eNoResults);
	console.log(`Lexicon built in ${Math.round(performance.now()-t0_buildLexicon)} ms.`);
};
const updateLexiconActiveEntry = (newActiveEntry) => {
	// must run before updating project.activeEntry
	const eLexicon = tabContent[TAB_LEXICON].querySelector('#lexicon-content');
	for (let i = 0; i < lexicon.orderedL1.length; i++) {
		if (lexicon.orderedL1[i].entryId === project.activeEntry) {
			eLexicon.querySelector(`#lexicon-entry-${i}`).classList.remove('active-entry');
		}
		if (lexicon.orderedL1[i].entryId === newActiveEntry) {
			eLexicon.querySelector(`#lexicon-entry-${i}`).classList.add('active-entry');
		}
	}
};
const filterLexicon = () => {
	const t0_search = performance.now();
	const frag = new RegExp(`^${RegExp.escape(tabContent[TAB_LEXICON].querySelector('#lexicon-search').value)}`, 'i'); // RegExp(string,flags)
	console.log(frag);
	let numResults = 0;
	for (let i = 0; i < lexicon.orderedL1.length; i++) {
		if (frag.test(lexicon.orderedL1[i].word)) {
			numResults++;
			tabContent[TAB_LEXICON].querySelector(`#lexicon-entry-${i}`).style.display = ''; // empty string defaults to original value
		} else {
			tabContent[TAB_LEXICON].querySelector(`#lexicon-entry-${i}`).style.display = 'none';
		}
	}
	tabContent[TAB_LEXICON].querySelector(`#lexicon-no-entries`).style.display = (numResults === 0) ? '' : 'none'; // empty string defaults to original value
	console.log(`Lexicon filtered in ${Math.round(performance.now()-t0_search)} ms.`);
};

const renderEditorHeader = () => {
	console.log(activeEntry.L1);
	Object.assign(tabContent[TAB_LEXICON].querySelector('#entry-L1'), {
		value : activeEntry.L1,
		onblur : () => {
			activeEntry.L1 = tabContent[TAB_LEXICON].querySelector('#entry-L1').value.split(RE_SYNONYM_SPLITTER).join('; ');
			console.log(activeEntry.L1);
		}
	});
	tabContent[TAB_LEXICON].querySelector('#entry-catg').textContent = project.catgs[activeEntry.catg] ?? capitalize(activeEntry.catg);
	// TODO: try load image, set up image management modal
	if (activeEntry.images?.length > 0) {
		// const url = RegExp.escape(`${file.path}\\${activeEntry.images[0]}`);
		// can't use RegExp.escape() cuz it's too aggro and CSS doesn't un-escape all the chars
		const url = `${file.path}\\${activeEntry.images[0]}`.replaceAll('\\','\\\\');
		console.log(`Loading entry image "${url}"`);
		tabContent[TAB_LEXICON].querySelector('#entry-image').style.backgroundImage = `url("${url}")`;
		Object.assign(tabContent[TAB_LEXICON].querySelector('#entry-image'), {
			textContent : '', // remove "No Image" text
			onclick : () => console.log(`Open entry image management modal.`)
		});
	}
};
const renderWordform = i => {
	let e = document.getElementById('tpl-entry-wordform').content.cloneNode(true);
	// form select
	e.querySelector('select').replaceWith( document.querySelector('#tpl-form-select').content.cloneNode(true) );
	Object.assign(e.querySelector('select'), {
		id : `entry-form-${i}-selector`,
		value : activeEntry.L2[i].form ?? -1,
		onchange : () => {
			if (document.getElementById(`entry-form-${i}-selector`).value === '+') {
				console.log(`Add New Form, triggered by wordform ${i}`);
				document.getElementById(`entry-form-${i}-selector`).value = activeEntry.L2[i].form;
			} else {
				activeEntry.L2[i].formId = document.getElementById(`entry-form-${i}-selector`).value;
			}
		}
	});
	// word input
	Object.assign(e.querySelector('input'), {
		id : `entry-form-${i}-content`,
		value : activeEntry.L2[i].L2,
		onblur : () => {
			activeEntry.L2[i].synonyms = document.getElementById(`entry-form-${i}-content`).value.split(RE_SYNONYM_SPLITTER).join('; ');
			console.log(activeEntry.L2[i]);
		}
	});
	// audio
	if (activeEntry.L2[i].audio?.length > 0) {
		const eAudioGallery = e.querySelector('.audio-gallery');
		eAudioGallery.innerHTML = '';
		for (let audio of activeEntry.L2[i].audio) {
			const url = `${file.path}\\${audio}`.replaceAll('\\','\\\\');
			let eAudio = document.createElement('button');
			eAudio.classList.add('icon-audio');
			eAudio.onclick = () => {
				console.log(`Entry ${i} playing audio "${url}".`);
				audioPlayer.play(url);
			};
			eAudioGallery.appendChild(eAudio);
		}
	}
	// menu
	e.querySelector('.options-menu').id = `entry-form-${i}-menu`;
	e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt,`#entry-form-${i}-menu`);
	e.querySelector('.options-menu > .menu-option-standard').onclick = () => console.log(`Trigger modal: manage audio for wordform ${i}`);
	e.querySelector('.options-menu > .menu-option-caution').onclick = () => console.log(`Trigger modal: delete wordform ${i}`);

	// events
	tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').appendChild(e);
};
const renderSentence = i => {
	let e = document.getElementById('tpl-entry-sentence').content.cloneNode(true);
	// form select
	e.querySelector('select').replaceWith( document.querySelector('#tpl-form-select').content.cloneNode(true) );
	Object.assign(e.querySelector('select'), {
		id : `entry-sentence-${i}-selector`,
		value : activeEntry.sents[i].form ?? -1,
		onchange : () => {
			if (document.getElementById(`entry-sentence-${i}-selector`).value === '+') {
				console.log(`Add New Form, triggered by sentence ${i}`);
				document.getElementById(`entry-sentence-${i}-selector`).value = activeEntry.sents[i].form;
			} else {
				activeEntry.sents[i].form = document.getElementById(`entry-sentence-${i}-selector`).value;
			}
		}
	});
	// audio
	if (activeEntry.sents[i].audio?.length > 0) {
		const eAudioGallery = e.querySelector('.audio-gallery');
		eAudioGallery.innerHTML = '';
		for (let audio of activeEntry.sents[i].audio) {
			const url = `${file.path}\\${audio}`.replaceAll('\\','\\\\');
			let eAudio = document.createElement('button');
			eAudio.classList.add('icon-audio');
			eAudio.onclick = () => {
				console.log(`Entry ${i} playing audio "${url}".`);
				audioPlayer.play(url);
			};
			eAudioGallery.appendChild(eAudio);
		}
	}
	// sentences
	Object.assign(e.querySelector('.entry-sentence-L1'), {
		id : `entry-sentence-${i}-L1`,
		value : activeEntry.sents[i].L1,
		onblur : () => {
			activeEntry.sents[i].L1 = document.getElementById(`entry-sentence-${i}-L1`).value;
			console.log(activeEntry.sents[i]);
		}
	});
	Object.assign(e.querySelector('.entry-sentence-L2'), {
		id : `entry-sentence-${i}-L2`,
		value : activeEntry.sents[i].L2,
		onblur : () => {
			activeEntry.sents[i].L2 = document.getElementById(`entry-sentence-${i}-L2`).value;
			console.log(activeEntry.sents[i]);
		}
	});
	// menu
	e.querySelector('.options-menu').id = `entry-sentence-${i}-menu`;
	e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt,`#entry-sentence-${i}-menu`);
	e.querySelector('.options-menu > .menu-option-standard').onclick = () => console.log(`Trigger modal: manage audio for sentence ${i}`);
	e.querySelector('.options-menu > .menu-option-caution').onclick = () => console.log(`Trigger modal: delete sentence ${i}`);

	tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').appendChild(e);
};
const renderNote = i => {
	let e = document.getElementById('tpl-entry-note').content.cloneNode(true);
	e.querySelector('p').textContent = `Note #${i+1}`;
	Object.assign(e.querySelector('textarea'), {
		id : `entry-note-${i}`,
		value : activeEntry.notes[i].note,
		onblur : () => {
			activeEntry.notes[i].note = document.getElementById(`entry-note-${i}`).value;
			console.log(activeEntry.notes[i]);
		}
	});
	tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').appendChild(e);
};

const addWordform = () => {
	activeEntry.L2.push({ formId : -1, synonyms : [] });
	renderWordform(activeEntry.L2.length - 1);
};
const addSentence = () => {
	activeEntry.sentences.push({ formId : -1, L1 : "", L2 : "" });
	renderSentence(activeEntry.sentences.length - 1);
};
const addNote = () => {
	activeEntry.notes.push({ formId : -1, note : "" });
	renderNote(activeEntry.notes.length - 1);
};

const toggleMenu = (evt,menuId) => {
	evt.stopPropagation(); // menu closes when user clicks outside it, so block that if user clicked explicit menu trigger
	
	// console.log(`Current menu is "${activeMenu}". Toggling menu "${menuId}"...`);
	
	if (!menuId) {
		// no menu targetted -> close active menu, if any
		if (activeMenu) {
			// console.log(`No menu targetted. Closing prev menu...`);
			tabContent[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
			activeMenu = undefined;
		} else {
			console.log(`No menu targetted. No open menues need closing.`);
		}
	} else if (menuId === activeMenu) {
		// this menu already open -> close it
		// console.log(`Menu already open. Toggling closed...`);
		tabContent[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
		activeMenu = undefined;
	} else {
		// diff menu already open -> close it
		if (activeMenu) {
			// console.log(`Closing menu "${activeMenu}"...`);
			tabContent[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
		}
		// open target menu
		// console.log(`Opening menu "${menuId}"...`);
		tabContent[TAB_LEXICON].querySelector(menuId).style.visibility = 'visible';
		activeMenu = menuId;
	}

	// clicked inside menu -> do nothing
	// clicked menu trigger
		// if this menu already open -> close it
		// if a diff menu open -> close that menu, then open this one
		// if no menu is open -> open this menu
	// clicked somewhere else -> close open menu, if any

};
window.addEventListener('click', e => {
	if (activeMenu && !tabContent[TAB_LEXICON].querySelector(activeMenu).contains(e.target)) {
		toggleMenu(e, undefined); // if a menu was open and we clicked something unrelated to menus, close it
	}
});



////////////////////////////////////////////////////////////////////////

//// IPC INCOMING ////



const tryOpenProject = async () => {
	// trigger file select from main process
	const res = await window.electronAPI.openProject();
	console.log(res);
	if (res.canceled) return;
	if (res.error) { console.error(res.message); return; }
	// if we got a valid file, trigger loading screen and try to parse it
	// TODO: trigger loading screen
	if (res.path) {
		console.log(res.path, typeof res.path);
		await tryLoadProject(res.path);
	} else {
		console.error(`Open file dialogue did not return a valid filepath.`);
		// TODO: cancel loading screen
	}
};
const tryLoadProject = async (path) => {
	const t0_loadProject = performance.now();
	// request JSON parse of selected file
	const res = await window.electronAPI.loadProject(path);
	console.log(res);
	if (res.error) { console.error(res.message); return; }
	// parse JSON file and perform indexing
	lexicon.fromJSON(res.path, res.json);

	// visible updates:

	// TODO: deactivate loading screen
	// refresh UI
	populateQuickCopyBar();
	// refresh project tab
	populateProjectTab();
	renderTab(TAB_PROJECT);
	const t1_loadProject = performance.now();
	console.log(`Project file loaded in ${Math.round(t1_loadProject-t0_loadProject)} ms.`);

	// background updates:

	// check media
	await tryListMedia(path);
	const t2_loadProject = performance.now();
	console.log(`Media scanned in ${Math.round(t2_loadProject-t1_loadProject)} ms.`);
	// refresh lexicon tab
	populateLexicon();
	tabContent[TAB_LEXICON].querySelector('#lexicon-search').addEventListener('keyup', evt => {
		// TODO: convert to debounce timer so input isn't blocked on slower machines
			// keep global(?) timeout that is cleared on keydown, restarted on keyup, and triggers filterLexicon() on completion
		filterLexicon();
	});
	if (project.activeEntry !== -1) {
		console.log(`Loading entry ${project.activeEntry}`);
		tryLoadEntry(project.activeEntry,true);
	} else {
		console.log('Project did not specify an entry to load.');
	}
	console.log(`Lexicon tab built in ${Math.round(performance.now()-t2_loadProject)} ms.`);
	console.log(`All loading finished in ${Math.round(performance.now()-t0_loadProject)} ms.`);
}
const tryListMedia = async (path) => {
	// request list of files in %PROJDIR%/assets
	const res = await window.electronAPI.listMedia(path);
	console.log(res);
	if (res.error) { console.error(res.message); return; }
	// TODO: sort into audio/video buckets
		// need complete list of supported filetypes for chromium
		// https://www.chromium.org/audio-video/ => video/audio[mp4,mp3,wav,ogg,webm]
		// may need to self-test this one
	// scan for missing or unused files
	console.log( Object.keys(lexicon.media) );
	for (let file of res.media) {
		if (!lexicon.media[file]) mediaUnused.push(file);
	}
	console.log('Unused media:',mediaUnused);
	for (let file in lexicon.media) {
		if (res.media.indexOf(file) === -1) mediaMissing.push(file);
	}
	console.log('Missing media',mediaMissing);
};
const tryLoadEntry = (i,forceLoad) => {
	if (i < 0 || i >= lexicon.data.length) {
		console.error(`Cannot load entry ${i}, out of bounds. Max index is ${lexicon.data.length-1}.`);
		return;
	}
	if (i === project.activeEntry && !forceLoad) {
		console.warn('Reload of active entry blocked by default to prevent loss of scroll position, edit history, etc. Use tryLoadEntry(i,true) to force reload.');
		return;
	}
	// set active entry, update sub-components
	updateLexiconActiveEntry(i);
	project.activeEntry = i;
	activeEntry = lexicon.data[project.activeEntry];
	console.log(activeEntry);
	buildFormSelect(activeEntry.catg);
	// reset entry editor
	tabContent[TAB_LEXICON].querySelector('#entry-editor').replaceWith( document.querySelector('#tpl-entry-editor').content.firstElementChild.cloneNode(true) );
	// rebuild header
	renderEditorHeader();
	// rebuild wordforms
	tabContent[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
	if (activeEntry.L2.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = `<div class='entry-section-no-content'>No Wordforms</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.L2.length; i++) renderWordform(i);
	}
	// rebuild sentences
	tabContent[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sents.length})`;
	if (activeEntry.sents.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = `<div class='entry-section-no-content'>No Sentences</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.sents.length; i++) renderSentence(i);
	}
	// rebuild notes
	tabContent[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
	if (activeEntry.notes.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = `<div class='entry-section-no-content'>No Notes</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.notes.length; i++) renderNote(i);
	}
	// page events
	tabContent[TAB_LEXICON].querySelector('#entry-delete').onclick = () => console.log(`Modal: confirm delete entry ${i}`);
	// tabContent[TAB_LEXICON].querySelector('#entry-delete').onclick = () => showModal();
};



//// IPC OUTGOING ////

const saveLangInfo = () => {
	//
};



////////////////////////////////

init();

tryOpenProject();








///////////////////////////////////////



// // I/O
// const tryOpenProject = async () => {
//     // trigger file select from main process
//     const res = await window.electronAPI.openProject();
//     console.log(res);
//     if (res.canceled) return;
//     if (res.error) { console.error(res.message); return; }

//     // TODO: check for unsaved changes, prompt user if necessary

//     // if file valid, record path and try to load parsed lang info
//     console.log(`Loading project: ${project.path}`);
//     project.path = res.path;
//     project.modified = false;
//     project.activeEntry = res.activeEntry ?? -1;
//     console.log(project);
//     eStatbarLeft.textContent = project.path;

//     // render tab content skeletons off-DOM
//     // get lang info, update project tab
//     await tryGetLangInfo(); // refreshes project tab
// };
// const tryGetLangInfo = async () => {
//     const res = await window.electronAPI.getLangInfo();
//     console.log(res);
//     if (res.error) { console.error(res.message); return; }
//     // save data in renderer context, then refresh project tab
//     L2 = res.L2;
//     buildProjectTab();
//     loadTab(TAB_PROJECT);
//     await tryLoadLexicon(); // constructs lexicon tab and search tab
//     // await tryLoadEntry
// };
// const tryLoadLexicon = async () => {
//     // get ordered words for L1,L2
// };
// const tryLoadEntry = async (i) => {
//     const res = await window.electronAPI.getEntry(i);
//     console.log(res);
//     if (res.error) { console.error(res.message); return; }
//     // set as active entry, and update sub-components
//     activeEntry = res;
//     console.log(activeEntry);
//     buildFormSelect(activeEntry.catg);
//     // rebuild header
//     updateEditorHeader();
//     // rebuild wordforms
//     tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = '';
//     tabContent[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
//     for (let i = 0; i < activeEntry.L2.length; i++) renderWordform(i);
//     // for (let i = 0; i < activeEntry.L2.length; i++) {
//     //     //
//     // }
//     // rebuild sentences
//     tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
//     tabContent[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sentences.length})`;
//     for (let i = 0; i < activeEntry.sentences.length; i++) renderSentence(i);
//     // rebuild notes
//     tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
//     tabContent[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
//     for (let i = 0; i < activeEntry.notes.length; i++) renderNote(i);
//     // page events
//     tabContent[TAB_LEXICON].querySelector('#entry-delete').onclick = () => showModal();
// };



// // DOM anchors
// const eNavTabs = [
//     document.getElementById('navtab-0'),
//     document.getElementById('navtab-1'),
//     document.getElementById('navtab-2')
// ];
// const eStatbarLeft = document.getElementById('statbar-left');
// const eStatbarRight = document.getElementById('statbar-right');
// // dynamic DOM anchors
// let activeElement = document.getElementById('r-content');

// // off-DOM content
// const TAB_PROJECT = 0;
// const TAB_LEXICON = 1;
// const TAB_SEARCH = 2;
// const tabContent = [];
// tabContent[TAB_PROJECT] = (() => {
//     let e = document.getElementById('tpl-project-page').content.firstElementChild.cloneNode(true);
//     e.querySelector('#lang-name').onblur = () => console.log(`Update language name to "${e.querySelector('#lang-name').value}"`);
//     e.querySelector('#lang-abbr').onblur = () => console.log(`Update language abbreviation to "${e.querySelector('#lang-abbr').value}"`);
//     e.querySelector('#lang-alph').onblur = () => console.log(`Update language alphabet to "${e.querySelector('#lang-alph').value}"`);
//     return e;
// })();
// tabContent[TAB_LEXICON] = (() => {
//     let e = document.getElementById('tpl-lexicon-page').content.firstElementChild.cloneNode(true);
//     let lexicon = e.querySelector('#lexicon-content');
//     orderedWordsL1 = [];
//     for (let i = 0; i < 30; i++) {
//         // TODO: populate from actual lexicon
//         orderedWordsL1.push(`Entry ${i}`);
//     }
//     for (let i = 0; i < orderedWordsL1.length; i++) {
//         let lexEntry = document.createElement('div');
//             lexEntry.classList.add('lexicon-entry');
//             if (i === 0) lexEntry.classList.add('active-entry');
//             lexEntry.textContent = `Entry ${i}`;
//         lexicon.appendChild(lexEntry);
//     }

//     // e.querySelector('#entry-forms-count').onclick = () => tryLoadEntry(0);
//     // e.querySelector('#entry-add-wordform').onclick = () => addWordform();
//     // e.querySelector('#entry-add-sentence').onclick = () => addSentence();
//     // e.querySelector('#entry-add-note').onclick = () => addNote();
//     return e;
// })();
// tabContent[TAB_SEARCH] = (() => {
//     //
// })();
// // (() => {
// //     // tab 0: project
// //     let e = document.getElementById('tpl-project-page').content.firstElementChild.cloneNode(true);
// //     e.querySelector('#lang-name').onblur = () => console.log(`Update language name to "${e.querySelector('#lang-name').value}"`);
// //     e.querySelector('#lang-abbr').onblur = () => console.log(`Update language abbreviation to "${e.querySelector('#lang-abbr').value}"`);
// //     e.querySelector('#lang-alph').onblur = () => console.log(`Update language alphabet to "${e.querySelector('#lang-alph').value}"`);
// //     tabContent[TAB_PROJECT] = e;
// // })();
// (() => {
//     let e = document.getElementById('tpl-lexicon-page').content.firstElementChild.cloneNode(true);
//     let lexicon = e.querySelector('#lexicon-content');
//     orderedWordsL1 = [];
//     for (let i = 0; i < 30; i++) {
//         // TODO: populate from actual lexicon
//         orderedWordsL1.push(`Entry ${i}`);
//     }
//     for (let i = 0; i < orderedWordsL1.length; i++) {
//         let lexEntry = document.createElement('div');
//             lexEntry.classList.add('lexicon-entry');
//             if (i === 0) lexEntry.classList.add('active-entry');
//             lexEntry.textContent = `Entry ${i}`;
//         lexicon.appendChild(lexEntry);
//     }

//     // e.querySelector('#entry-forms-count').onclick = () => tryLoadEntry(0);
//     // e.querySelector('#entry-add-wordform').onclick = () => addWordform();
//     // e.querySelector('#entry-add-sentence').onclick = () => addSentence();
//     // e.querySelector('#entry-add-note').onclick = () => addNote();
//     tabContent[TAB_LEXICON] = e;
// })();

// const nWelcomePage = (() => {
//     let e = document.getElementById('tpl-welcome-page').content.firstElementChild.cloneNode(true);
//     e.querySelector('#btn-open-project').onclick = () => tryOpenProject(); // needs to be lambda, so function can be hoisted properly
//     // document.getElementById('btn-open-project').onclick = tryOpenProject;
//     return e;
// })();
// let tplFormSelect = (() => {
//     let e = document.createElement('template');
//     e.innerHTML = `<select><option value='-1'>-- Select Option --</option><option value='+'>++ ADD NEW ++</option></select>`;
//     return e;
// })();

// const buildFormSelect = (catg) => {
//     console.log(`Building form selector for catg "${catg}"...`);
//     // if target catg not encountered before, create it
//     if (!L2.forms[catg]) L2.forms[catg] = [];
//     // rebuild form select template for target catg
//     let eStr = ``;
//     eStr += `<select>`;
//         eStr += `<option value='-1'>-- Select Option --</option>`;
//         for (let i = 0; i < L2.forms[catg].length; i++) eStr += `<option value='${i}'>${L2.forms[catg][i]}</option>`;
//         eStr += `<option value='+'>++ ADD NEW ++</option>`;
//     eStr += `</select>`;
//     // TODO: UNSAFE innerHTML with arbitrary input
//     // setting innerHTML seems to be the only way to mod a template; it's all or nothing
//     // need to clean this
//     tplFormSelect.innerHTML = eStr;
// };

// // modals

// let activeModal = null;
// const showModal  = () => {
//     closeModal();
//     activeModal = document.getElementById('tpl-modal').content.firstElementChild.cloneNode(true); // clone firstElementChild so activeModal is actual element and not document fragment
//     activeModal.querySelector('#modal-actions button').onclick = () => closeModal();
//     document.body.appendChild(activeModal);
// };
// const closeModal = () => {
//     if (activeModal) {
//         console.log('Scrubing modal...');
//         activeModal.remove();
//         activeModal = null; // element should be garbage collected
//     }
// }






// // Project Tab

// const buildWelcomePage = () => {
//     activeElement.replaceWith(nWelcomePage);
//     activeElement = document.getElementById('r-content'); // need to rebind var to whatever content container is active
// };
// const buildProjectTab = () => {
//     if (!project.path) {
//         buildWelcomePage();
//     } else {
//         tabContent[TAB_PROJECT].querySelector('#lang-name').value = L2.name;
//         tabContent[TAB_PROJECT].querySelector('#lang-abbr').value = L2.abbr;
//         tabContent[TAB_PROJECT].querySelector('#lang-alph').value = L2.alph;
//     }
// };



// // Lexicon Tab

// const updateEditorHeader = () => {
//     // interact with entry.L1[0], since eng guaranteed to only have 1 form
//     Object.assign(tabContent[TAB_LEXICON].querySelector('#entry-L1'), {
//         value : activeEntry.L1[0].join('; '),
//         onblur : () => {
//             activeEntry.L1[0] = tabContent[TAB_LEXICON].querySelector('#entry-L1').value.split(RE_SYNONYM_SPLITTER);
//             console.log(activeEntry.L1[0]);
//         }
//     });
//     tabContent[TAB_LEXICON].querySelector('#entry-catg').textContent = L2.catgs[activeEntry.catg];
// };

// const renderWordform = i => {
//     let e = document.getElementById('tpl-entry-wordform').content.cloneNode(true);
//     // form select
//     e.querySelector('select').replaceWith( tplFormSelect.content.cloneNode(true) );
//     Object.assign(e.querySelector('select'), {
//         id : `entry-form-${i}-selector`,
//         value : activeEntry.L2[i].formId ?? -1,
//         onchange : () => {
//             if (document.getElementById(`entry-form-${i}-selector`).value === '+') {
//                 console.log(`Add New Form, triggered by wordform ${i}`);
//             } else {
//                 activeEntry.L2[i].formId = document.getElementById(`entry-form-${i}-selector`).value;
//             }
//         }
//     });
//     // word input
//     Object.assign(e.querySelector('input'), {
//         id : `entry-form-${i}-content`,
//         value : activeEntry.L2[i].synonyms.join('; '),
//         onblur : () => {
//             activeEntry.L2[i].synonyms = document.getElementById(`entry-form-${i}-content`).value.split(RE_SYNONYM_SPLITTER);
//             console.log(activeEntry.L2[i]);
//         }
//     });
//     // menu
//     e.querySelector('.options-menu').id = `entry-form-${i}-menu`;
//     e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt,`#entry-form-${i}-menu`);
//     e.querySelector('.options-menu > .menu-option-standard').onclick = () => console.log(`Trigger modal: manage audio for wordform ${i}`);
//     e.querySelector('.options-menu > .menu-option-caution').onclick = () => console.log(`Trigger modal: delete wordform ${i}`);

//     // events
//     tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').appendChild(e);
// };
// const renderSentence = i => {
//     let e = document.getElementById('tpl-entry-sentence').content.cloneNode(true);
//     // form select
//     e.querySelector('select').replaceWith( tplFormSelect.content.cloneNode(true) );
//     Object.assign(e.querySelector('select'), {
//         id : `entry-sentence-${i}-selector`,
//         value : activeEntry.sentences[i].formId ?? -1,
//         onchange : () => {
//             if (document.getElementById(`entry-sentence-${i}-selector`).value === '+') {
//                 console.log(`Add New Form, triggered by sentence ${i}`);
//             } else {
//                 activeEntry.sentences[i].formId = document.getElementById(`entry-sentence-${i}-selector`).value;
//             }
//         }
//     });
//     // sentences
//     Object.assign(e.querySelector('.entry-sentence-L1'), {
//         id : `entry-sentence-${i}-L1`,
//         value : activeEntry.sentences[i].L1,
//         onblur : () => {
//             activeEntry.sentences[i].L1 = document.getElementById(`entry-sentence-${i}-L1`).value;
//             console.log(activeEntry.sentences[i]);
//         }
//     });
//     Object.assign(e.querySelector('.entry-sentence-L2'), {
//         id : `entry-sentence-${i}-L2`,
//         value : activeEntry.sentences[i].L2,
//         onblur : () => {
//             activeEntry.sentences[i].L2 = document.getElementById(`entry-sentence-${i}-L2`).value;
//             console.log(activeEntry.sentences[i]);
//         }
//     });
//     // menu
//     e.querySelector('.options-menu').id = `entry-sentence-${i}-menu`;
//     e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt,`#entry-sentence-${i}-menu`);
//     e.querySelector('.options-menu > .menu-option-standard').onclick = () => console.log(`Trigger modal: manage audio for sentence ${i}`);
//     e.querySelector('.options-menu > .menu-option-caution').onclick = () => console.log(`Trigger modal: delete sentence ${i}`);

//     tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').appendChild(e);
// };
// const renderNote = i => {
//     let e = document.getElementById('tpl-entry-note').content.cloneNode(true);
//     e.querySelector('p').textContent = `Note #${i+1}`;
//     Object.assign(e.querySelector('textarea'), {
//         id : `entry-note-${i}`,
//         value : activeEntry.notes[i].note,
//         onblur : () => {
//             activeEntry.notes[i].note = document.getElementById(`entry-note-${i}`).value;
//             console.log(activeEntry.notes[i]);
//         }
//     });
//     tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').appendChild(e);
// };

// const addWordform = () => {
//     activeEntry.L2.push({ formId : -1, synonyms : [] });
//     renderWordform(activeEntry.L2.length - 1);
// };
// const addSentence = () => {
//     activeEntry.sentences.push({ formId : -1, L1 : "", L2 : "" });
//     renderSentence(activeEntry.sentences.length - 1);
// };
// const addNote = () => {
//     activeEntry.notes.push({ formId : -1, note : "" });
//     renderNote(activeEntry.notes.length - 1);
// };

// const toggleMenu = (evt,menuId) => {
//     evt.stopPropagation(); // menu closes when user clicks outside it, so block that if user clicked explicit menu trigger
	
//     // console.log(`Current menu is "${activeMenu}". Toggling menu "${menuId}"...`);
	
//     if (!menuId) {
//         // no menu targetted -> close active menu, if any
//         if (activeMenu) {
//             // console.log(`No menu targetted. Closing prev menu...`);
//             tabContent[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
//             activeMenu = undefined;
//         } else {
//             console.log(`No menu targetted. No open menues need closing.`);
//         }
//     } else if (menuId === activeMenu) {
//         // this menu already open -> close it
//         // console.log(`Menu already open. Toggling closed...`);
//         tabContent[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
//         activeMenu = undefined;
//     } else {
//         // diff menu already open -> close it
//         if (activeMenu) {
//             // console.log(`Closing menu "${activeMenu}"...`);
//             tabContent[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
//         }
//         // open target menu
//         // console.log(`Opening menu "${menuId}"...`);
//         tabContent[TAB_LEXICON].querySelector(menuId).style.visibility = 'visible';
//         activeMenu = menuId;
//     }

//     // clicked inside menu -> do nothing
//     // clicked menu trigger
//         // if this menu already open -> close it
//         // if a diff menu open -> close that menu, then open this one
//         // if no menu is open -> open this menu
//     // clicked somewhere else -> close open menu, if any

// };
// window.addEventListener('click', e => {
//     if (activeMenu && !tabContent[TAB_LEXICON].querySelector(activeMenu).contains(e.target)) {
//         toggleMenu(e, undefined); // if a menu was open and we clicked something unrelated to menus, close it
//     }
// });



// // Search Tab

// //



// // tab switching
// function loadTab (tabId) {
//     console.log(`Load tab ${tabId}`);
//     // disable tabs if no project is open
//     if (!project.path) return;
//     // update tabs
//     for (let i = 0; i < eNavTabs.length; i++) {
//         if (i === tabId && !eNavTabs[i].classList.contains('active-navtab')) {
//             eNavTabs[i].classList.add('active-navtab');
//         } else if (i !== tabId && eNavTabs[i].classList.contains('active-navtab')) {
//             eNavTabs[i].classList.remove('active-navtab');
//         }
//     }
//     // update contents
//     if (tabId < tabContent.length) {
//         activeElement.replaceWith(tabContent[tabId]);
//         activeElement = document.getElementById('r-content'); // rebind var to active container
//     }
// }

// buildProjectTab();
// // tryLoadEntry(0);
// tryOpenProject();

// // attach event handlers
// for (let i = 0; i < eNavTabs.length; i++) {
// 	eNavTabs[i].onclick = e => loadTab(i);
// }
// eStatbarRight.onclick = e => window.electronAPI.flipToggle();
// eStatbarLeft.onclick = async e => {
//     const res = await window.electronAPI.openProject();
//     console.log(res);
// }



// // (async () => {
// //     // test confirms objects get deep copied when piped from main to renderer
// //     // changes here will not mutate data on main
// //     let res = await window.electronAPI.requestObject();
// //     console.log(res);
// //     res.v = 9;
// //     console.log(res);
// //     window.electronAPI.checkObject();
// // })();