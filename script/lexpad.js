
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

// https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts
// https://www.electronjs.org/docs/latest/tutorial/application-menu

const RE_SYNONYM_SPLITTER = /;\s*/;

const TAB_PROJECT = 0;
const TAB_LEXICON = 1;
const TAB_SEARCH = 2;

const SEARCH_PATTERN_BEGINS = 0;
const SEARCH_PATTERN_CONTAINS = 1;
const SEARCH_PATTERN_ENDS = 2;

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
// lexicon search
let search = {
	activePattern : SEARCH_PATTERN_BEGINS,
	ePatterns : [
		// lexicon search pattern "begins"
		// lexicon search pattern "contains"
		// lexicon search pattern "ends"
	]
};
// search tab search
let searchSettings = {
	// tags in same category OR together, tags in diff categories AND together
		// "catg:n catg:v has:audio has:image" === (catg:n OR catg:v) AND (has:audio OR has:image)
	// can use "&" to AND tags in same category
		// "has:audio has:image" === has:audio OR has:image
		// "has:audio&has:image" === has:audio AND has:image
	// using "&" between tags of diff categories changes nothing
		// "catg:n&has:image" === catg:n AND has:image === "catg:n has:image"
	// in:_ tags are true-by-default
		// search everywhere unless user specifies otherwise
		// adding one or more in:_ tags sets those tags true and all others false
	// has:_ tags are false-by-default
		// no req imposed unless user adds one
	DEFAULT_INCLUDE : Object.freeze({
		in : { L1 : false, L2 : false, sentL1 : false, sentL2 : false, note : false },
		catg : { 'n' : false, 'v' : false, 'adj' : false, misc : false },
		has : {
			L1 : false, L2 : false, sentence : false, note : false, // content
			audio : false, image : false // media
		}
	}),
	include : {
		in : { L1 : false, L2 : false, sentL1 : false, sentL2 : false, note : false },
		catg : { 'n' : false, 'v' : false, 'adj' : false, misc : false },
		has : {
			L1 : false, L2 : false, sentence : false, note : false, // content
			audio : false, image : false // media
		}
	},
	exclude : {
		in : { L1 : true, L2 : false, sentL1 : true, sentL2 : false, note : false },
		catg : { 'n' : true, 'v' : true, 'adj' : true, misc : true },
		has : {
			L1 : false, L2 : false, sentence : false, note : false, // content
			audio : false, image : false // media
		}
	},
	reset : () => {
		for (let filter of ['in','catg','has']) {
			for (let prop in searchSettings.DEFAULT_INCLUDE[filter]) {
				// console.log(`reset include ${filter} ${prop} ${searchSettings.include[filter][prop]===searchSettings.DEFAULT_INCLUDE[filter][prop] ? 'SET' : 'RESET'}`);
				searchSettings.include[filter][prop] = searchSettings.DEFAULT_INCLUDE[filter][prop];
			}
		}
	},
	toggle : (s) => {
		let [exclude,k,v] = s.match(/(-?)(in|catg|has):(.*)/)?.slice(1,4) ?? [];
		if (k === undefined && v === undefined) { console.warn(`"${s}" does not contain a recognized tag.`); return; }
		const includeExclude = (exclude) ? 'exclude' : 'include';
		console.log(`${includeExclude} ${[k,v]}: ${searchSettings[includeExclude][k][v]} -> ${!searchSettings[includeExclude][k][v]}`);
		if (typeof searchSettings[includeExclude][k][v] !== 'boolean') { console.warn(`"${v}" not a recognized ${k}:_ tag. (${s})`); return; }
		searchSettings[includeExclude][k][v] = !searchSettings[includeExclude][k][v];
	},
	fromString : (s) => {
		//
	},
	submitSearch : (frag) => {
		const t0_advancedSearch = performance.now();

		const reFrag = new RegExp( RegExp.escape(frag) );
		console.log(reFrag);
		// all tags of same type false => none specified => search in all
		// const inAll = !searchSettings.include.in.L1 && !searchSettings.include.in.L2 && !searchSettings.include.in.sentL1 && !searchSettings.include.in.sentL2 && !searchSettings.include.in.note;
		const inAll = Object.values(searchSettings.include.in).every(x => !x);
		const catgAll = Object.values(searchSettings.include.catg).every(x => !x);
		const hasNone = Object.values(searchSettings.include.has).every(x => !x);
		// use ||= short circuiting for efficient checking
		for (let entry of lexicon.data) {
			// IN [L1,L2,sentL1,sentL2,note]
			let matchIn = false;
			// matchIn ||= (inAll || searchSettings.include.in.L1) && reFrag.test(entry.L1); // exposes "x; y" if desired; future gubbins toggle
			matchIn ||= (inAll || searchSettings.include.in.L1) && entry.L1.split(RE_SYNONYM_SPLITTER).some(w => reFrag.test(w));
			matchIn ||= (inAll || searchSettings.include.in.L2) && entry.L2.some(form => reFrag.test(form.L2)); // need to integrate "x; y" gubbins toggle here too
			matchIn ||= (inAll || searchSettings.include.in.sentL1) && entry.sents.some(sent => reFrag.test(sent.L1));
			matchIn ||= (inAll || searchSettings.include.in.sentL2) && entry.sents.some(sent => reFrag.test(sent.L2));
			matchIn ||= (inAll || searchSettings.include.in.note) && entry.notes.some(note => reFrag.test(note.note));
			// console.log(`"${reFrag}" in L1 "${entry.L1}" : ${reFrag.test(entry.L1)},${entry.L1.split(RE_SYNONYM_SPLITTER).some(w => reFrag.test(w))}`);
			// for (let form of entry.L2) console.log(`"${reFrag}" in L2 "${form.L2}" : ${reFrag.test(form.L2)},${form.L2.split(RE_SYNONYM_SPLITTER).some(w => reFrag.test(w))}`);
			// for (let sent of entry.sents) console.log(`"${reFrag}" in sentence L1,L2: ${reFrag.test(sent.L1)},${reFrag.test(sent.L2)}`);
			// for (let note of entry.notes) console.log(`"${reFrag}" in note: ${reFrag.test(note.note)}`);

			// CATG [...,misc]
			let matchCatg = false;
			matchCatg ||= (catgAll || searchSettings.include.catg[entry.catg]);
			// console.log(`all? ${catgAll}, match? ${catgAll || searchSettings.include.catg[entry.catg]}`);

			// HAS [L1,L2,sentence,note,audio,image]
			let notHas = false; // can't use ||= short circuit w/ true->false accumulator, so use false->true accumulator and invert later
			notHas ||= searchSettings.include.has.L1 && !entry.L1;
			notHas ||= searchSettings.include.has.L2 && !(entry.L2?.length > 0);
			notHas ||= searchSettings.include.has.sentence && !(entry.sents?.length > 0);
			notHas ||= searchSettings.include.has.note && !(entry.notes?.length > 0);
			notHas ||= searchSettings.include.has.audio && !(
				entry.L2?.some(form => form.audio?.length > 0) || entry.sents?.some(sentence => sentence.audio?.length > 0) // (should have audio) AND NOT(either has audio)
			);
			notHas ||= searchSettings.include.has.image && !(entry.images?.length > 0);
			let matchHas = !notHas;
			// console.log(`has:L1 ${!!entry.L1}`);
			// console.log(`has:L2 ${entry.L2?.length>0}`);
			// console.log(`has:sentence ${entry.sents?.length>0}`);
			// console.log(`has:note ${entry.notes?.length>0}`);
			// console.log(`has:audio(form) ${entry.L2?.some(form => form.audio?.length>0)}`);
			// console.log(`has:audio(sentence) ${entry.sents?.some(sentence => sentence.audio?.length>0)}`);
			// console.log(`has:image ${entry.images?.length>0}`);
			// console.log(`match has? ${matchHas}`);

			console.log((matchIn && matchCatg && matchHas) ? 'MATCH' : 'NO MATCH');
		}

		console.log(`Advanced search done in ${Math.round(performance.now()-t0_advancedSearch)} ms.`);
		// if all of search.in are false, set inAll = true (not searching specific fields)
		// for entry in lexicon, include if:
			// (inAll) || (search.in[L1] && entry.L1.contains(searchFrag)) || ...
			// AND entry.catg != 'misc' && search.catg[entry.catg] == true
			// AND (search.has[audio] && entry.containsAudio()) && ...
	}
};


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
		search.ePatterns[SEARCH_PATTERN_BEGINS] = tabContent[TAB_LEXICON].querySelector('#lexicon-search-pattern-begins');
		search.ePatterns[SEARCH_PATTERN_BEGINS].onclick = () => setLexiconSearchPattern(SEARCH_PATTERN_BEGINS);
		search.ePatterns[SEARCH_PATTERN_CONTAINS] = tabContent[TAB_LEXICON].querySelector('#lexicon-search-pattern-contains');
		search.ePatterns[SEARCH_PATTERN_CONTAINS].onclick = () => setLexiconSearchPattern(SEARCH_PATTERN_CONTAINS);
		search.ePatterns[SEARCH_PATTERN_ENDS] = tabContent[TAB_LEXICON].querySelector('#lexicon-search-pattern-ends');
		search.ePatterns[SEARCH_PATTERN_ENDS].onclick = () => setLexiconSearchPattern(SEARCH_PATTERN_ENDS);
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-clear').onclick = () => clearLexiconSearch();
		tabContent[TAB_LEXICON].querySelector('#entry-editor').innerHTML = '';
		tabContent[TAB_LEXICON].querySelector('#entry-editor').appendChild( document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true) );
		tabContent[TAB_LEXICON].querySelector('#entry-editor .window-status p').textContent = 'Load an entry to get started';
		// search tab
		tabContent[TAB_SEARCH] = document.getElementById('tpl-search-page').content.firstElementChild.cloneNode(true);
		tabContent[TAB_SEARCH].style.padding = '0';
		tabContent[TAB_SEARCH].querySelector('#search-query').addEventListener('keyup', evt => {
			// searchSettings.toggle(tabContent[TAB_SEARCH].querySelector('#search-query').value);
			// searchSettings.include.in.L2 = true;
			// searchSettings.include.in.sentL1 = true;
			// searchSettings.include.in.sentL2 = true;
			// searchSettings.include.in.note = true;
			// searchSettings.include.catg['n'] = true;
			searchSettings.include.has.audio = true;
			searchSettings.submitSearch(tabContent[TAB_SEARCH].querySelector('#search-query').value);
			// searchSettings.reset();
		});
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
	// language data
	// TODO: onblur events mark project modified
	Object.assign(tabContent[TAB_PROJECT].querySelector('#lang-name'), {
		value : lexicon.L2.name ?? '',
		onblur : () => {
			const e = tabContent[TAB_PROJECT].querySelector('#lang-name');
			if (lexicon.L2.name === e.value) return;
			console.log(`Lang name changed from "${lexicon.L2.name}" to "${e.value}".`);
			lexicon.L2.name = e.value;
			console.log(lexicon.L2);
		}
	});
	Object.assign(tabContent[TAB_PROJECT].querySelector('#lang-abbr'), {
		value : lexicon.L2.abbr ?? '',
		onblur : () => {
			const e = tabContent[TAB_PROJECT].querySelector('#lang-abbr');
			if (lexicon.L2.abbr === e.value) return;
			console.log(`Lang abbr changed from "${lexicon.L2.abbr}" to "${e.value}".`);
			lexicon.L2.abbr = e.value;
			console.log(lexicon.L2);
		}
	});
	Object.assign(tabContent[TAB_PROJECT].querySelector('#lang-alph'), {
		value : lexicon.L2.alph ?? '',
		onblur : () => {
			const e = tabContent[TAB_PROJECT].querySelector('#lang-alph');
			if (lexicon.L2.alph === e.value) return;
			console.log(`Lang alph changed from "${lexicon.L2.alph}" to "${e.value}".`);
			lexicon.L2.alph = e.value;
			console.log(lexicon.L2);
			populateQuickCopyBar();
		}
	});
	// project statistics
	const stats = lexicon.calculateStatistics(); // guaranteed complete, doesn't req checks for props
	console.log(stats);
	tabContent[TAB_PROJECT].querySelector('#project-stats-num-entries > span').textContent = stats.numEntries ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L1 > span').textContent = stats.wordCounts?.L1 ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L1').onclick = () => console.log(`Search tab "in:L1"`);
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L2 > span').textContent = stats.wordCounts?.L2 ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L2').onclick = () => console.log(`Search tab "in:L2"`);
	tabContent[TAB_PROJECT].querySelector('#project-stats-sentence-count > span').textContent = stats.numSentences ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-sentence-count').onclick = () => console.log(`Search tab "has:sentence"`);
	tabContent[TAB_PROJECT].querySelector('#project-stats-notes-count > span').textContent = stats.numNotes ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-notes-count').onclick = () => console.log(`Search tab "has:note"`);
	tabContent[TAB_PROJECT].querySelector('#project-stats-audio-count > span').textContent = stats.mediaCounts.audioEntries ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-audio-count').onclick = () => console.log(`Search tab "has:audio"`);
	tabContent[TAB_PROJECT].querySelector('#project-stats-image-count > span').textContent = stats.mediaCounts.imageEntries ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-image-count').onclick = () => console.log(`Search tab "has:image"`);
	const eStatsCatgs = tabContent[TAB_PROJECT].querySelector('#project-stats-catgs');
	eStatsCatgs.innerHTML = '';
	for (let catg in stats.catgCounts) {
		let e = document.getElementById('tpl-catg-bubble').content.firstElementChild.cloneNode(true);
			e.title = `catg:${catg}`;
			e.onclick = () => console.log(`Search tab "catg:${catg}"`);
			e.querySelector('.catg-bubble-label').textContent = project.catgs[catg] ?? catg;
			e.querySelector('.catg-bubble-count').textContent = stats.catgCounts[catg];
		eStatsCatgs.appendChild(e);
	}
	let e = document.getElementById('tpl-catg-bubble').content.firstElementChild.cloneNode(true);
		e.title = `catg:misc`;	
		e.onclick = () => console.log(`Search tab "catg:misc"`);
		e.querySelector('.catg-bubble-label').textContent = 'MISC';
		e.querySelector('.catg-bubble-count').textContent = stats.catgMiscCount
	eStatsCatgs.appendChild(e);
};

// lexicon tab
const setLexiconSearchPattern = (pattern) => {
	if (search.activePattern === pattern) return false;
	const patternNames = ['begins','contains','ends'];
	console.log(`Set lexicon search pattern from "${patternNames[search.activePattern]}" to "${patternNames[pattern]}".`);
	search.activePattern = pattern;
	for (let i = 0; i < search.ePatterns.length; i++) {
		if (i === pattern) {
			search.ePatterns[i].classList.add('active-search-pattern');
		} else {
			search.ePatterns[i].classList.remove('active-search-pattern');
		}
	}
	filterLexicon();
	return true;
};
const clearLexiconSearch = () => {
	tabContent[TAB_LEXICON].querySelector('#lexicon-search').value = '';
	tabContent[TAB_LEXICON].querySelector('#lexicon-search').focus();
	filterLexicon();
};
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
	const searchText = RegExp.escape(tabContent[TAB_LEXICON].querySelector('#lexicon-search').value);
	const frag = new RegExp(
		[`^${searchText}`,`${searchText}`,`${searchText}$`][search.activePattern ?? 0], // [begins,contains,ends]
		'i'
	); // RegExp(string,flags)
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
		value : activeEntry.L2[i].L2 ?? '',
		onblur : () => {
			activeEntry.L2[i].L2 = document.getElementById(`entry-form-${i}-content`).value.split(RE_SYNONYM_SPLITTER).join('; ');
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
	activeEntry.L2.push({ formId : -1, L2 : "" });
	if (activeEntry.L2.length === 1) {
		tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = '';
	}
	renderWordform(activeEntry.L2.length - 1);
	tabContent[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
};
const addSentence = () => {
	activeEntry.sents.push({ formId : -1, L1 : "", L2 : "" });
	if (activeEntry.sents.length === 1) {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
	}
	renderSentence(activeEntry.sents.length - 1);
	tabContent[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sents.length})`;
};
const addNote = () => {
	activeEntry.notes.push({ formId : -1, note : "" });
	if (activeEntry.notes.length === 1) {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
	}
	renderNote(activeEntry.notes.length - 1);
	tabContent[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
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
	tabContent[TAB_LEXICON].querySelector('#entry-add-wordform').onclick = () => addWordform();
	// rebuild sentences
	tabContent[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sents.length})`;
	if (activeEntry.sents.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = `<div class='entry-section-no-content'>No Sentences</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.sents.length; i++) renderSentence(i);
	}
	tabContent[TAB_LEXICON].querySelector('#entry-add-sentence').onclick = () => addSentence();
	// rebuild notes
	tabContent[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
	if (activeEntry.notes.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = `<div class='entry-section-no-content'>No Notes</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.notes.length; i++) renderNote(i);
	}
	tabContent[TAB_LEXICON].querySelector('#entry-add-note').onclick = () => addNote();
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

// // search single-tag parse/toggle unit tests
// searchSettings.toggle('ctg:v');
// searchSettings.toggle('catg:v');
// searchSettings.toggle('catg:v');
// searchSettings.toggle('has:note');
// searchSettings.toggle('bop');
// searchSettings.toggle('catg:x');
// searchSettings.toggle('has:nope');
// searchSettings.toggle('-bop');
// searchSettings.toggle('-catg:n');
// searchSettings.toggle('-catg:n');




tryOpenProject();








///////////////////////////////////////



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




// // (async () => {
// //     // test confirms objects get deep copied when piped from main to renderer
// //     // changes here will not mutate data on main
// //     let res = await window.electronAPI.requestObject();
// //     console.log(res);
// //     res.v = 9;
// //     console.log(res);
// //     window.electronAPI.checkObject();
// // })();