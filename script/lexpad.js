
console.log(`Inline JS running successfully.`);

import * as lexicon from "./dictionary.js";
import { file, project } from "./dictionary.js";

// TODO: IPC/security is adding too much complexity for early stages
	// pipe entire JSON object to dictionary.js
	// do all indexing/sorting/etc there
	// lexpad.js uses dictionary.js API to selectively request data
		// defend against accidental user bungles, but assume API is safe
		// add scrubbing to dictionary.js later down the pipeline

// https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts
// https://www.electronjs.org/docs/latest/tutorial/application-menu

const RE_SYNONYM_SPLITTER = /;\s*/;
const SYNONYM_JOIN = '; ';

const TAB_PROJECT = 0;
const TAB_LEXICON = 1;
const TAB_SEARCH = 2;
const TAB_ANALYSIS = 3;

const SEARCH_PATTERN_BEGINS = 0;
const SEARCH_PATTERN_CONTAINS = 1;
const SEARCH_PATTERN_ENDS = 2;

const DBG_TAG_STATES = ['EXCL','NOREQ','INCL'];
const TAG_F = 0; // tag false (exclude)
const TAG_N = 1; // tag null (no constraint)
const TAG_T = 2; // tag true (include)

const MODAL_FOCUS_MAXLEN = 20;

const capitalize = s => (s[0]??'').toUpperCase() + s.slice(1);
const trim = (text,maxLen=null) => (maxLen === null || text.length <= maxLen) ? text : `${text.slice(0,maxLen)}...`; // if maxLen neg, trim n chars off end; if maxLen pos, act as max len
const setListStr = (title,setToList) => {
	let arrFromSet = [...setToList].filter(x => x).sort();
	// const numNonBlank = arrFromSet.length; // no longer necessary since every media usage Set() has blank vals scrubbed
	if (arrFromSet.length === 0) arrFromSet.push(`// [no items in this section]`);
	return `//// ${title} (${setToList.size}) ////\n\n${arrFromSet.join('\n')}`;
};


//// media.js ////

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

// gubbins toggles (aka settings / behavior config)
let gubbins = {

	//// ALREADY INTEGRATED ////

	// window behavior
	quickCopy : {
		title : `Quick Copy`,
		desc : `Clicking characters in the quick-copy bar will either copy them to the clipboard, or insert them into the active textbox. If OFF: Click to insert, Ctrl+Click to copy. If ON: Click to copy, Ctrl+Click to insert.`,
		state : false
	},

	//// PLANNED ////

	// search behavior
	instantSearch : {
		title : `Instant Search`,
		desc : `If ON: Changing parameters in the search tab will update results immediately. Only recommended on faster devices. If OFF: After adjusting search paramters, click Submit or hit Enter in the searchbar to update results. Recommended for slower devices.`,
		state : false
		// TODO: add gubbins check to all search tab settings buttons
		// TODO: on keyup in searchbar, reset timer that updates search results
	}
};

// let tabNeedsUpdate = [
//     false, // project tab
//     false, // lexicon tab
//     false, // search tab
// ];
// key state tracking
let ctrlDown = false;
let shiftDown = false;
window.addEventListener('keydown', evt => {
	if (evt.key === 'Control') ctrlDown = true;
	if (evt.key === 'Shift') shiftDown = true;
	renderModifierKeys();
	if (file.isOpen) {
		updateQuickCopyBar();
		document.querySelector('#quick-copy-tooltip').textContent = (ctrlDown === gubbins.quickCopy.state) ? 'Click to insert:' : 'Click to copy:';
	}
});
window.addEventListener('keyup', evt => {
	if (evt.key === 'Control') ctrlDown = false;
	if (evt.key === 'Shift') shiftDown = false;
	renderModifierKeys();
	if (file.isOpen) {
		updateQuickCopyBar();
		document.querySelector('#quick-copy-tooltip').textContent = (ctrlDown === gubbins.quickCopy.state) ? 'Click to insert:' : 'Click to copy:';
	}
});
const renderModifierKeys = () => {
	let modStr = [];
	if (ctrlDown) modStr.push('CTRL');
	if (shiftDown) modStr.push('SHIFT');
	eStatbarRight.textContent = modStr.join('+');
};
// focus anchors
let activeInput;

// active entry
let activeEntry = null; // pointer to active entry, ie lexicon.data[i]



// hiding menus
let activeMenu = { // access menu via container.querySelector(id)
	container : null, // pointer to ancestor of target menu
	id : '', // element id of target menu
	reset : () => {
		activeMenu.container = null;
		activeMenu.id = '';
	}
};
const toggleMenu = (evt,menuContainer,menuId) => {
	evt.stopPropagation(); // active menu closes when user clicks outside it; block that if user explicitly clicked menu trigger
	
	// console.log(`Current menu is "${activeMenu.id}". Toggling menu "${menuId}"...`);

	if (!menuId) {
		// no menu targetted -> close active menu, if any
		if (activeMenu.id) {
			// console.log(`No menu targetted. Closing prev menu...`);
			activeMenu.container.querySelector(activeMenu.id).style.visibility = 'hidden';
			activeMenu.reset();
		} else {
			console.log(`No menu targetted. No open menues need closing.`);
		}
	} else if (menuId === activeMenu.id) {
		// this menu already open -> close it
		// console.log(`Menu already open. Toggling closed...`);
		activeMenu.container.querySelector(activeMenu.id).style.visibility = 'hidden';
		activeMenu.reset();
	} else {
		// diff menu already open -> close it
		if (activeMenu.id) {
			// console.log(`Closing menu "${activeMenu.id}"...`);
			activeMenu.container.querySelector(activeMenu.id).style.visibility = 'hidden';
		}
		// open target menu
		// console.log(`Opening menu "${menuId}"...`);
		menuContainer.querySelector(menuId).style.visibility = 'visible';
		activeMenu.container = menuContainer;
		activeMenu.id = menuId;
	}

	// clicked inside menu -> do nothing
	// clicked menu trigger
		// if this menu already open -> close it
		// if a diff menu open -> close that menu, then open this one
		// if no menu is open -> open this menu
	// clicked somewhere else -> close open menu, if any
};
window.addEventListener('click', evt => {
	if (activeMenu.id && !activeMenu.container.querySelector(activeMenu.id).contains(evt.target)) {
		toggleMenu(evt, undefined, undefined); // if a menu was open and we clicked something unrelated to menus, close it
	}
});



// global escape
window.addEventListener('keydown', e => {
	if (e.key === 'Escape') {
		if (isTutorialOpen) {
			closeTutorial();
		} else if (isModalOpen) {
			closeModal();
		// TODO: else, close popup banner
		} else if (activeMenu.id) {
			toggleMenu({stopPropagation:()=>{}}, activeMenu.container, activeMenu.id); // stub evt to prevent errors
		}
		// prio order:
			// tutorial
			// modal
			// popup notification
			// options menu
	}
});

// update triggers
let lastUpdate = { // performance.now() when instance of datafield last modified
	// project
	projectCatgs : -1,
	projectIgnorelist : -1,
	// language / L2
	languageName : -1,
	languageAbbr : -1,
	languageAlph : -1,
	languageAuth : -1,
	languageForms : -1,
	// lexicon / data
	lexiconL1 : -1,
	lexiconL2 : -1,
	lexiconSentenceL1 : -1,
	lexiconSentenceL2 : -1,
	lexiconNotes : -1,
	lexiconAudio : -1,
	lexiconImages : -1,
};
let lastRender = { // performance.now() when UI components last rendered (if lastRender[x] < lastUpdate[y] then rerender x)
	mediaChecker : -1,
	sentenceChecker : -1
};
// const markUpdated = (datafield) => {
// 	if (!lastUpdate[datafield]) { console.warn(`Datafield "${datafield}" not registered. Unable to mark.`); return false; }
// 	lastUpdate[datafield] = performance.now();
// 	console.log(`Datafield "${datafield}" marked updated @ ${lastUpdate[datafield]}`);
// 	return true;
// };
const markUpdated = (...datafields) => {
	for (let datafield of datafields) {
		if (typeof lastUpdate[datafield] === 'undefined') {
			console.warn(`Datafield "${datafield}" not registered. Unable to mark.`);
			continue;
		}
		lastUpdate[datafield] = performance.now();
		console.log(`Datafield "${datafield}" marked updated @ ${lastUpdate[datafield]}`);
	}
};
// const markRendered = (component) => {
// 	if (!lastRender[component]) { console.warn(`Render-component "${component}" not registered. Unable to mark.`); return false; }
// 	lastRender[component] = performance.now();
// 	console.log(`Render-component "${component}" marked rendered @ ${lastRender[component]}`);
// 	return true;
// };
const markRendered = (...components) => {
	for (let component of components) {
		if (typeof lastRender[component] === 'undefined') {
			console.warn(`Render-component "${component}" not registered. Unable to mark.`);
			continue;
		}
		lastRender[component] = performance.now();
		console.log(`Render-component "${component}" marked rendered @ ${lastRender[component]}`);
	}
};
const needsUpdate = (component) => {
	if (!lastRender[component]) { console.warn(`Render-component "${component}" not registered. Nothing to update.`); return false; }
	// analysis tab checkers
	if (component === 'mediaChecker') {
		if (lastRender[component] < lastUpdate.lexiconAudio) return true;
		if (lastRender[component] < lastUpdate.lexiconImages) return true;
		return false;
	}
	if (component === 'sentenceChecker') {
		if (lastRender[component] < lastUpdate.lexiconL2) return true;
		if (lastRender[component] < lastUpdate.lexiconSentenceL2) return true;
		return false;
	}
	// default
	console.warn(`Render-component "${component}" not registered. Nothing to update.`);
	return false;
}



// lexicon search
let search = {
	activePattern : SEARCH_PATTERN_BEGINS,
	searchL2 : false,
	ePatterns : [
		// lexicon search pattern "begins"
		// lexicon search pattern "contains"
		// lexicon search pattern "ends"
	]
};
// search tab search
let searchSettings = {
	// tags from same filter OR together, tags from diff filters AND together
		// "catg:n catg:v has:audio has:image" === (catg:n OR catg:v) AND (has:audio OR has:image)
	// use "&" to AND tags in same category
		// "has:audio has:image" === has:audio OR has:image
		// "has:audio&has:image" === has:audio AND has:image
	// using "&" between tags of diff categories changes nothing
		// "catg:n&has:image" === catg:n AND has:image === "catg:n has:image"
	// in:_ tags are true-by-default
		// search everywhere unless user specifies otherwise
		// adding one or more in:_ tags sets those tags true and all others false
	// has:_ tags are false-by-default
		// no req imposed unless user adds one
	showFullResults : false, // if true, stop dynamically trimming portions of results that don't match search
	and : { in : false, catg : false, has : false }, // tags OR together by default; toggle to AND tags together instead
	filters : {
		in : { L1 : TAG_N, L2 : TAG_N, sentL1 : TAG_N, sentL2 : TAG_N, note : TAG_N },
		catg : { misc : TAG_N },
		has : {
			L1 : TAG_N, L2 : TAG_N, sentence : TAG_N, note : TAG_N, // content
			audio : TAG_N, image : TAG_N // media
		}
	},
	resetFilter : (filter) => {
		if (!searchSettings.filters[filter]) { console.warn(`"${filter}" is not a recognized filter.`); return; }
		for (let qualifier in searchSettings.filters[filter]) {
			searchSettings.filters[filter][qualifier] = TAG_N;
		}
	},
	reset : () => {
		for (let filter of ['in','catg','has']) {
			for (let qualifier in searchSettings.filters[filter]) {
				searchSettings.filters[filter][qualifier] = TAG_N;
			}
		}
	},
	set : (tag) => {
		// parse input string
		const [negate,k,v] = tag.match(/(-?)(in|catg|has):(.*)/)?.slice(1,4) ?? [];
		if (k === undefined && v === undefined) { console.warn(`"${tag}" does not contain a recognized tag.`); return; }
		if (typeof searchSettings.filters[k][v] !== 'number') { console.warn(`"${v}" is not a recognized ${k}:_ qualifier. (${tag})`); return; }
		// set tag
		const prev = DBG_TAG_STATES[searchSettings.filters[k][v]];
		searchSettings.filters[k][v] = (negate) ? TAG_F : TAG_T;
		console.log(`SET ${k}:${v} ${prev}->${DBG_TAG_STATES[searchSettings.filters[k][v]]}`);
	},
	unset : (tag) => {
		// parse input string
		const [negate,k,v] = tag.match(/(-?)(in|catg|has):(.*)/)?.slice(1,4) ?? [];
		if (k === undefined && v === undefined) { console.warn(`"${tag}" does not contain a recognized tag.`); return; }
		if (typeof searchSettings.filters[k][v] !== 'number') { console.warn(`"${v}" is not a recognized ${k}:_ qualifier. (${tag})`); return; }
		// unset tag
		const prev = DBG_TAG_STATES[searchSettings.filters[k][v]];
		searchSettings.filters[k][v] = TAG_N;
		console.log(`SET ${k}:${v} ${prev}->${DBG_TAG_STATES[searchSettings.filters[k][v]]}`);
	},
	setPrev : (tag) => {
		// parse input string
		const [negate,k,v] = tag.match(/(-?)(in|catg|has):(.*)/)?.slice(1,4) ?? [];
		if (k === undefined && v === undefined) { console.warn(`"${tag}" does not contain a recognized tag.`); return; }
		if (typeof searchSettings.filters[k][v] !== 'number') { console.warn(`"${v}" is not a recognized ${k}:_ qualifier. (${tag})`); return; }
		// set to prev state
		const prev = DBG_TAG_STATES[searchSettings.filters[k][v]];
		searchSettings.filters[k][v] = (searchSettings.filters[k][v] - 1 + 3) % 3;
		console.log(`SET ${k}:${v} ${prev}->${DBG_TAG_STATES[searchSettings.filters[k][v]]}`);
	},
	setNext : (tag) => {
		// parse input string
		const [negate,k,v] = tag.match(/(-?)(in|catg|has):(.*)/)?.slice(1,4) ?? [];
		if (k === undefined && v === undefined) { console.warn(`"${tag}" does not contain a recognized tag.`); return; }
		if (typeof searchSettings.filters[k][v] !== 'number') { console.warn(`"${v}" is not a recognized ${k}:_ qualifier. (${tag})`); return; }
		// set to next state
		const prev = DBG_TAG_STATES[searchSettings.filters[k][v]];
		searchSettings.filters[k][v] = (searchSettings.filters[k][v] + 1) % 3;
		console.log(`SET ${k}:${v} ${prev}->${DBG_TAG_STATES[searchSettings.filters[k][v]]}`);
	},
	fromString : (s) => {
		//
	},
	toString : () => {
		let a = [];
		for (let filter of ['in','catg','has']) {
			for (let qualifier in searchSettings.filters[filter]) {
				switch (searchSettings.filters[filter][qualifier]) {
					case TAG_T: a.push(`${filter}:${qualifier}`); break;
					case TAG_F: a.push(`-${filter}:${qualifier}`); break;
				}
			}
		}
		return a.join(' ');
	},
	submitSearch : (frag) => {
		const t0_advancedSearch = performance.now();

		const reFrag = new RegExp( RegExp.escape(frag), 'i' );
		const reFragHighlight = new RegExp( `(${RegExp.escape(frag)})`, 'ig' );
		const tryHighlight = (text='') => text.replaceAll(reFragHighlight, '<span class="text-highlight">$1</span>');
		console.log(reFrag);
		// no tags in category specified => search in all
		const inAny = Object.values(searchSettings.filters.in).every(x => x === TAG_N);
		const catgAny = Object.values(searchSettings.filters.catg).every(x => x === TAG_N);
		const hasAny = Object.values(searchSettings.filters.has).every(x => x === TAG_N);
		console.log(inAny,catgAny,hasAny);
		// check tags with ||= short circuiting for efficient accumulators
		let numMatches = 0;
		let eResults = document.createElement('div');
			eResults.id = `search-results`;
			eResults.classList.add('flex-col');
		for (let i = 0; i < lexicon.data.length; i++) {
			// IN [L1,L2,sentL1,sentL2,note]
			let matchIn = false;
			if (!searchSettings.and.in) {
				// use OR between tags
				if (inAny) {
					matchIn = reFrag.test(lexicon.data[i].L1)
						|| lexicon.data[i].L2.some(form => reFrag.test(form.L2))
						|| lexicon.data[i].sents.some(sent => reFrag.test(sent.L1))
						|| lexicon.data[i].sents.some(sent => reFrag.test(sent.L2))
						|| lexicon.data[i].notes.some(note => reFrag.test(note.note));
				} else {
					// no match if -in:L1 and L1.contains(frag)
					// no match if in:L1 and !L1.contains(frag)
					// !inAny && TAG_N => some other in:_ is active but not this one => no way to DQ
					matchIn ||= (searchSettings.filters.in.L1 === TAG_F) && !reFrag.test(lexicon.data[i].L1);
					matchIn ||= (searchSettings.filters.in.L1 === TAG_T) && reFrag.test(lexicon.data[i].L1);
					matchIn ||= (searchSettings.filters.in.L2 === TAG_F) && !lexicon.data[i].L2.some(form => reFrag.test(form.L2));
					matchIn ||= (searchSettings.filters.in.L2 === TAG_T) && lexicon.data[i].L2.some(form => reFrag.test(form.L2));
					matchIn ||= (searchSettings.filters.in.sentL1 === TAG_F) && !lexicon.data[i].sents.some(sent => reFrag.test(sent.L1));
					matchIn ||= (searchSettings.filters.in.sentL1 === TAG_T) && lexicon.data[i].sents.some(sent => reFrag.test(sent.L1));
					matchIn ||= (searchSettings.filters.in.sentL2 === TAG_F) && !lexicon.data[i].sents.some(sent => reFrag.test(sent.L2));
					matchIn ||= (searchSettings.filters.in.sentL2 === TAG_T) && lexicon.data[i].sents.some(sent => reFrag.test(sent.L2));
					matchIn ||= (searchSettings.filters.in.note === TAG_F) && !lexicon.data[i].notes.some(note => reFrag.test(note.note));
					matchIn ||= (searchSettings.filters.in.note === TAG_T) && lexicon.data[i].notes.some(note => reFrag.test(note.note));
				}
			} else {
				// use AND between tags
				let notIn = false;
				if (inAny) {
					// && short-circuits
					// notIn = !L1.contains() && !L2.contains() && ...
					notIn = !reFrag.test(lexicon.data[i].L1)
						&& !lexicon.data[i].L2.some(form => reFrag.test(form.L2))
						&& !lexicon.data[i].sents.some(sent => reFrag.test(sent.L1))
						&& !lexicon.data[i].sents.some(sent => reFrag.test(sent.L2))
						&& !lexicon.data[i].notes.some(note => reFrag.test(note.note));
				} else {
					// no match if -in:L1 and L1.contains(frag)
					// no match if in:L1 and !L1.contains(frag)
					// !inAny && TAG_N => some other in:_ is active but not this one => no way to DQ
					notIn ||= (searchSettings.filters.in.L1 === TAG_F) && reFrag.test(lexicon.data[i].L1);
					notIn ||= (searchSettings.filters.in.L1 === TAG_T) && !reFrag.test(lexicon.data[i].L1);
					notIn ||= (searchSettings.filters.in.L2 === TAG_F) && lexicon.data[i].L2.some(form => reFrag.test(form.L2));
					notIn ||= (searchSettings.filters.in.L2 === TAG_T) && !lexicon.data[i].L2.some(form => reFrag.test(form.L2));
					notIn ||= (searchSettings.filters.in.sentL1 === TAG_F) && lexicon.data[i].sents.some(sent => reFrag.test(sent.L1));
					notIn ||= (searchSettings.filters.in.sentL1 === TAG_T) && !lexicon.data[i].sents.some(sent => reFrag.test(sent.L1));
					notIn ||= (searchSettings.filters.in.sentL2 === TAG_F) && lexicon.data[i].sents.some(sent => reFrag.test(sent.L2));
					notIn ||= (searchSettings.filters.in.sentL2 === TAG_T) && !lexicon.data[i].sents.some(sent => reFrag.test(sent.L2));
					notIn ||= (searchSettings.filters.in.note === TAG_F) && lexicon.data[i].notes.some(note => reFrag.test(note.note));
					notIn ||= (searchSettings.filters.in.note === TAG_T) && !lexicon.data[i].notes.some(note => reFrag.test(note.note));
				}
				matchIn = !notIn;
			}
			
			// CATG [...,misc]
			let matchCatg = false;
			if (searchSettings.and.catg) {
				// use AND between tags
				let notCatg = false;
				if (catgAny) {
					// no-op; lack of criteria => no way to disqualify match
				} else {
					for (let catg in searchSettings.filters.catg) {
						if (catg !== 'misc') {
							notCatg ||= (searchSettings.filters.catg[catg] === TAG_F) && (lexicon.data[i].catg === catg);
							notCatg ||= (searchSettings.filters.catg[catg] === TAG_T) && (lexicon.data[i].catg !== catg);
						}
					}
					const isCatgMisc = searchSettings.filters.catg[lexicon.data[i].catg] === undefined || lexicon.data[i].catg === 'misc';
					notCatg ||= (searchSettings.filters.catg['misc'] === TAG_F) && isCatgMisc;
					notCatg ||= (searchSettings.filters.catg['misc'] === TAG_T) && !isCatgMisc;
				}
				matchCatg = !notCatg;
			} else {
				// use OR between tags
				if (catgAny) {
					matchCatg = true; // no-op; lack of criteria => no way to disqualify match
				} else {
					for (let catg in searchSettings.filters.catg) {
						if (catg !== 'misc') {
							matchCatg ||= (searchSettings.filters.catg[catg] === TAG_F) && (lexicon.data[i].catg !== catg);
							matchCatg ||= (searchSettings.filters.catg[catg] === TAG_T) && (lexicon.data[i].catg === catg);
						}
					}
					const isCatgMisc = searchSettings.filters.catg[lexicon.data[i].catg] === undefined || lexicon.data[i].catg === 'misc';
					matchCatg ||= (searchSettings.filters.catg['misc'] === TAG_F) && !isCatgMisc;
					matchCatg ||= (searchSettings.filters.catg['misc'] === TAG_T) && isCatgMisc;
				}
			}

			// HAS [L1,L2,sentence,note,audio,image]
			let matchHas = false;
			if (searchSettings.and.has) {
				// use AND between tags
				let notHas = false;
				if (hasAny) {
					// no-op; lack of criteria => no way to disqualify match
				} else {
					notHas ||= (searchSettings.filters.has.L1 === TAG_F) && lexicon.data[i].L1;
					notHas ||= (searchSettings.filters.has.L1 === TAG_T) && !lexicon.data[i].L1;
					notHas ||= (searchSettings.filters.has.L2 === TAG_F) && (lexicon.data[i].L2?.length > 0);
					notHas ||= (searchSettings.filters.has.L2 === TAG_T) && !(lexicon.data[i].L2?.length > 0);
					notHas ||= (searchSettings.filters.has.sentence === TAG_F) && (lexicon.data[i].sents?.length > 0);
					notHas ||= (searchSettings.filters.has.sentence === TAG_T) && !(lexicon.data[i].sents?.length > 0);
					notHas ||= (searchSettings.filters.has.note === TAG_F) && (lexicon.data[i].notes?.length > 0);
					notHas ||= (searchSettings.filters.has.note === TAG_T) && !(lexicon.data[i].notes?.length > 0);
					notHas ||= (searchSettings.filters.has.audio === TAG_F) && (
						lexicon.data[i].L2?.some(form => form.audio?.length > 0) || lexicon.data[i].sents?.some(sentence => sentence.audio?.length > 0)
					);
					notHas ||= (searchSettings.filters.has.audio === TAG_T) && !(
						// (should have audio) AND NOT(either has audio)
						lexicon.data[i].L2?.some(form => form.audio?.length > 0) || lexicon.data[i].sents?.some(sentence => sentence.audio?.length > 0)
					);
					notHas ||= (searchSettings.filters.has.image === TAG_F) && (lexicon.data[i].images?.length > 0);
					notHas ||= (searchSettings.filters.has.image === TAG_T) && !(lexicon.data[i].images?.length > 0);
				}
				matchHas = !notHas;
			} else {
				// use OR between tags
				if (hasAny) {
					matchHas = true; // no-op; lack of criteria => no way to disqualify match
				} else {
					matchHas ||= (searchSettings.filters.has.L1 === TAG_F) && !lexicon.data[i].L1;
					matchHas ||= (searchSettings.filters.has.L1 === TAG_T) && lexicon.data[i].L1;
					matchHas ||= (searchSettings.filters.has.L2 === TAG_F) && !(lexicon.data[i].L2?.length > 0);
					matchHas ||= (searchSettings.filters.has.L2 === TAG_T) && (lexicon.data[i].L2?.length > 0);
					matchHas ||= (searchSettings.filters.has.sentence === TAG_F) && !(lexicon.data[i].sents?.length > 0);
					matchHas ||= (searchSettings.filters.has.sentence === TAG_T) && (lexicon.data[i].sents?.length > 0);
					matchHas ||= (searchSettings.filters.has.note === TAG_F) && !(lexicon.data[i].notes?.length > 0);
					matchHas ||= (searchSettings.filters.has.note === TAG_T) && (lexicon.data[i].notes?.length > 0);
					matchHas ||= (searchSettings.filters.has.audio === TAG_F) && !(
						lexicon.data[i].L2?.some(form => form.audio?.length > 0) || lexicon.data[i].sents?.some(sentence => sentence.audio?.length > 0)
					);
					matchHas ||= (searchSettings.filters.has.audio === TAG_T) && (
						// (should have audio) AND NOT(either has audio)
						lexicon.data[i].L2?.some(form => form.audio?.length > 0) || lexicon.data[i].sents?.some(sentence => sentence.audio?.length > 0)
					);
					matchHas ||= (searchSettings.filters.has.image === TAG_F) && !(lexicon.data[i].images?.length > 0);
					matchHas ||= (searchSettings.filters.has.image === TAG_T) && (lexicon.data[i].images?.length > 0);
				}
			}

			if (!matchIn || !matchCatg || !matchHas) continue;

			numMatches++;

			const hasImage = lexicon.data[i].images?.length > 0;
			const hasAudio = lexicon.data[i].L2?.some(form => form.audio?.length > 0) || lexicon.data[i].sents?.some(sentence => sentence.audio?.length > 0);

			let e = document.getElementById('tpl-search-result').content.firstElementChild.cloneNode(true);
				// e.onclick = () => console.log(`Load entry ${i}...`);
				e.onclick = () => {
					renderTab(TAB_LEXICON);
					tryLoadEntry(i);
				};
				// TODO: deleting entry in lexicon tab should clear search results so onclick doesn't become hanging pointer

			// header
			e.querySelector('.search-result-catg').textContent = capitalize(lexicon.data[i].catg || '---');
			if ((inAny || searchSettings.filters.in.L1 === TAG_T) && frag !== '') { // guaranteed match at this point, so either inAny&&in.L1==TAG_N or in.L1==TAG_T
				e.querySelector('.search-result-L1').innerHTML = tryHighlight(lexicon.data[i].L1); // TODO: clean UNSAFE arbitrary text
			} else {
				e.querySelector('.search-result-L1').textContent = lexicon.data[i].L1 || '---';
			}
			if (hasImage) e.querySelector('.search-result-header .icon:nth-child(1)').classList.add('icon-image');
			if (hasAudio) e.querySelector('.search-result-header .icon:nth-child(2)').classList.add('icon-audio');
			// wordforms
			const eWordformContainer = e.querySelector('.search-result-section-L2');
			let hasMatchingWordform = false;
			for (let form of lexicon.data[i].L2) {
				if (
					// always show section if dynamic results are turned off
					searchSettings.showFullResults
					// else, only show sections that match active filters and contain search query
					|| (inAny || searchSettings.filters.in.L2 === TAG_T) && reFrag.test(form.L2)
				) {
					hasMatchingWordform = true;
					const formName = (form.form >= 0) ? lexicon.L2.forms[lexicon.data[i].catg][form.form] : `[No Form Specified]`;
					const wordform = form.L2 || '---';
					let eForm = document.getElementById('tpl-search-result-wordform').content.firstElementChild.cloneNode(true);
					eForm.querySelector('p:nth-child(1)').textContent = formName;
					eForm.querySelector('p:nth-child(2)').innerHTML = tryHighlight(wordform); // TODO: clean UNSAFE arbitrary text
					eWordformContainer.appendChild(eForm);
				}
			}
			if (hasMatchingWordform) eWordformContainer.classList.add('active');
			// sentences
			const eSentenceContainer = e.querySelector('.search-result-section-sentences');
			let hasMatchingSentence = false;
			for (let sentId = 0; sentId < lexicon.data[i].sents.length; sentId++) {
				if (
					searchSettings.showFullResults
					|| (inAny || searchSettings.filters.in.sentL1 === TAG_T) && reFrag.test(lexicon.data[i].sents[sentId].L1)
					|| (inAny || searchSettings.filters.in.sentL2 === TAG_T) && reFrag.test(lexicon.data[i].sents[sentId].L2)
				) {
					hasMatchingSentence = true;
					const sentL1 = lexicon.data[i].sents[sentId].L1 || '---';
					const sentL2 = lexicon.data[i].sents[sentId].L2 || '---';
					let eSentence = document.getElementById('tpl-search-result-sentence').content.firstElementChild.cloneNode(true);
					eSentence.querySelector('.subtitle').textContent = `Sentence ${sentId+1}`;
					// given elem e w/ class='flex-row', e.querySelector('.flex-row') is targetting e; unsure if this is intended behavior
					eSentence.querySelector('.flex-col > p:nth-child(1)').innerHTML = ((inAny || searchSettings.filters.in.sentL1 === TAG_T) ? tryHighlight(sentL1) : sentL1) + ' '; // add space char for spacing + nice copy-pasting
					eSentence.querySelector('.flex-col > p:nth-child(2)').innerHTML = (inAny || searchSettings.filters.in.sentL2 === TAG_T) ? tryHighlight(sentL2) : sentL2; // TODO: clean UNSAFE arbitrary text
					eSentenceContainer.appendChild(eSentence);
				}
			}
			if (hasMatchingSentence) eSentenceContainer.classList.add('active');
			// notes
			const eNoteContainer = e.querySelector('.search-result-section-notes');
			let hasMatchingNote = false;
			for (let noteId = 0; noteId < lexicon.data[i].notes.length; noteId++) {
				if (
					searchSettings.showFullResults
					|| (inAny || searchSettings.filters.in.note === TAG_T) && reFrag.test(lexicon.data[i].notes[noteId].note)
				) {
					hasMatchingNote = true;
					const note = lexicon.data[i].notes[noteId].note || '---';
					let eNote = document.getElementById('tpl-search-result-note').content.firstElementChild.cloneNode(true);
					eNote.querySelector('.subtitle').textContent = `Note ${noteId+1}`;
					eNote.querySelector('p:nth-child(2)').innerHTML = tryHighlight(note); // TODO: clean UNSAFE arbitrary text
					eNoteContainer.appendChild(eNote);
				}
			}
			if (hasMatchingNote) eNoteContainer.classList.add('active');

			eResults.appendChild(e);
		}
		// check if we found any results
		if (numMatches === 0) {
			const eNoResults = document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true);
			eNoResults.querySelector('p').textContent = `No results...`;
			eResults.appendChild(eNoResults);
		}

		// display results
		tabContent[TAB_SEARCH].querySelector('#search-results-header-right').textContent = `${numMatches}/${lexicon.data.length} entries`;
		tabContent[TAB_SEARCH].querySelector('#search-results').replaceWith(eResults);
		
		console.log(`Advanced search done in ${Math.round(performance.now()-t0_advancedSearch)} ms.`);
		// if all of search.in are false, set inAny = true (not searching specific fields)
		// for entry in lexicon, include if:
			// (inAny) || (search.in[L1] && entry.L1.contains(searchFrag)) || ...
			// AND entry.catg != 'misc' && search.catg[entry.catg] == true
			// AND (search.has[audio] && entry.containsAudio()) && ...
	}
};


//// DOM ////

// static content anchors
const eNavTabs = [
	document.getElementById('navtab-0'),
	document.getElementById('navtab-1'),
	document.getElementById('navtab-2'),
	document.getElementById('navtab-3'),
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
	// analysis tab
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
	nWelcomePage.querySelector('#btn-open-project').onclick = () => tryBeginOpenProject(); // all onclick must be lambdas, so functions can be hoisted properly
	nWelcomePage.querySelector('#btn-create-project').onclick = () => tryBeginCreateProject();
	closeModal();
	closeTutorial();
	setWindowTitle();
	renderWelcomePage();
	// allow page to render, then build content skeletons off-DOM
	requestAnimationFrame(() => {
		const t0_init_deferred = performance.now();
		// project tab
		tabContent[TAB_PROJECT] = document.getElementById('tpl-project-page').content.firstElementChild.cloneNode(true);
		tabContent[TAB_PROJECT].querySelector('#dbg-mark-modified').onclick = () => markModified();
		// tabContent[TAB_PROJECT].querySelector('#dbg-trigger').onclick = () => document.title = `Cool New Title`;
		tabContent[TAB_PROJECT].querySelector('#dbg-trigger').onclick = () => exportTextFile('Hewwo wordle');
		// lexicon tab
		tabContent[TAB_LEXICON] = document.getElementById('tpl-lexicon-page').content.firstElementChild.cloneNode(true);
		// tabContent[TAB_LEXICON].style.padding = '0';
		registerInput(tabContent[TAB_LEXICON], '#lexicon-search');
		tabContent[TAB_LEXICON].querySelector('#lexicon-search').addEventListener('keyup', evt => {
			// TODO: convert to debounce timer so input isn't blocked on slower machines
				// keep global(?) timeout that is cleared on keydown, restarted on keyup, and triggers filterLexicon() on completion
			filterLexicon();
		});
		search.ePatterns[SEARCH_PATTERN_BEGINS] = tabContent[TAB_LEXICON].querySelector('#lexicon-search-pattern-begins');
		search.ePatterns[SEARCH_PATTERN_BEGINS].onclick = () => setLexiconSearchPattern(SEARCH_PATTERN_BEGINS);
		search.ePatterns[SEARCH_PATTERN_CONTAINS] = tabContent[TAB_LEXICON].querySelector('#lexicon-search-pattern-contains');
		search.ePatterns[SEARCH_PATTERN_CONTAINS].onclick = () => setLexiconSearchPattern(SEARCH_PATTERN_CONTAINS);
		search.ePatterns[SEARCH_PATTERN_ENDS] = tabContent[TAB_LEXICON].querySelector('#lexicon-search-pattern-ends');
		search.ePatterns[SEARCH_PATTERN_ENDS].onclick = () => setLexiconSearchPattern(SEARCH_PATTERN_ENDS);
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-L1').onclick = () => setLexiconSearchIndex(false);
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-L2').onclick = () => setLexiconSearchIndex(true);
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-clear').onclick = () => clearLexiconSearch();
		tabContent[TAB_LEXICON].querySelector('#lexicon-create-entry').onclick = () => openModalCreateEntry();
		tabContent[TAB_LEXICON].querySelector('#entry-editor').innerHTML = '';
		tabContent[TAB_LEXICON].querySelector('#entry-editor').appendChild( document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true) );
		tabContent[TAB_LEXICON].querySelector('#entry-editor .window-status p').textContent = 'Load an entry to get started';
		// search tab
		tabContent[TAB_SEARCH] = document.getElementById('tpl-search-page').content.firstElementChild.cloneNode(true);
		// tabContent[TAB_SEARCH].style.padding = '0';
		registerInput(tabContent[TAB_SEARCH], '#search-query');
		tabContent[TAB_SEARCH].querySelector('#search-query').addEventListener('keyup', evt => {
			// TODO: try parse searchSettings.fromString(input.value) in case user manually typed tag
			renderSearchFilters();
		});
		tabContent[TAB_SEARCH].querySelector('#search-bar').onsubmit = (evt) => {
			evt.preventDefault(); // prevent reload
			const frag = tabContent[TAB_SEARCH].querySelector('#search-query').value;
			const tags = searchSettings.toString();
			console.log(`SUBMIT SEARCH "${frag}" ${tags}`);
			// update search UI
			const eSearchLeft = tabContent[TAB_SEARCH].querySelector('#search-results-header-left');
			eSearchLeft.innerHTML = '';
			let eFrag = document.createElement('p');
				eFrag.textContent = `"${frag}"`;
			eSearchLeft.appendChild(eFrag);
			for (let tag of tags.split(' ')) {
				let e = document.createElement('p');
					e.textContent = `${tag}`;
					e.classList.add((tag[0] === '-') ? 'exclude' : 'include');
				eSearchLeft.appendChild(e);
			}
			// submit search
			tabContent[TAB_SEARCH].querySelector('#search-results-header-right').textContent = ``;
			const eResults = tabContent[TAB_SEARCH].querySelector('#search-results');
			let eLoading = document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true);
				eLoading.querySelector('p').textContent = 'Loading';
			eResults.innerHTML = '';
			eResults.appendChild(eLoading);
			const t0_search_deferred = performance.now();
			requestAnimationFrame(evt => {
				console.log(`Search deferred for ${Math.round(performance.now()-t0_search_deferred)} ms to guarantee frame render.`);
				searchSettings.submitSearch(frag);
			});
		};
		// analysis tab
		tabContent[TAB_ANALYSIS] = document.getElementById('tpl-analysis-page').content.firstElementChild.cloneNode(true);
		
		
		// enable tab switching
		eNavTabs[TAB_PROJECT].onclick = () => renderTab(TAB_PROJECT);
		eNavTabs[TAB_LEXICON].onclick = () => renderTab(TAB_LEXICON);
		eNavTabs[TAB_SEARCH].onclick = () => renderTab(TAB_SEARCH);
		eNavTabs[TAB_ANALYSIS].onclick = () => renderTab(TAB_ANALYSIS);
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
	// swap container content
	activeElement.replaceWith(tabContent[tabId]);
	activeElement = document.getElementById('r-content'); // rebind var to active container
	// focus management
	switch (tabId) {
		case TAB_PROJECT: tabContent[TAB_PROJECT].querySelector('#lang-name').focus(); break;
		case TAB_LEXICON: tabContent[TAB_LEXICON].querySelector('#lexicon-search').focus(); break;
		case TAB_SEARCH: tabContent[TAB_SEARCH].querySelector('#search-query').focus(); break;
		default: activeInput = null; console.warn(`Tab id ${tabId} does not have a designated focus target. Clearing focus anchor.`);
	}
	// deferred updates
	switch (tabId) {
		case TAB_ANALYSIS: checkUpdatesAnalysisTab(); break;
		default: console.log(`Tab id ${tabId} does not require deferred updates.`);
	}
	
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
const copyOrInsert = (letter='') => {
	if (shiftDown) letter = capitalize(letter);
	if (ctrlDown === gubbins.quickCopy.state) {
		// insert (click OR ctrl+click w/ quick copy on)
		if (activeInput) {
			activeInput.value += letter;
			activeInput.dispatchEvent(new Event('keyup', { bubbles: true })); // manually trigger keyup so live searchbars update
			activeInput.focus();
		}
		console.log(`Inserted "${letter}" in textbox.`);
	} else {
		// copy (ctrl+click OR click w/ quick copy on)
		navigator.clipboard.writeText(letter);
		console.log(`Copied "${letter}" to clipboard.`);
	}
};
const populateQuickCopyBar = () => {
	eStatbarLeft.innerHTML = `<p id="quick-copy-tooltip" class="no-wrap">Click to copy:</p>`;
	let englishAlphabet = lexicon.L1.alph.split(' ');
	let alphabet = lexicon.L2.alph.split(' ');
	let addedLetter = false;
	for (let i = 0; i < alphabet.length; i++) {
		const letter = alphabet[i];
		if (letter === '' || englishAlphabet.indexOf(letter) !== -1) continue;
		addedLetter = true;
		eStatbarLeft.appendChild( Object.assign(document.createElement('button'), {
			id : `quick-copy-${i}`,
			className : 'quick-copy-letter',
			textContent : letter,
			onclick : () => copyOrInsert(letter)
		}) );
	}
	if (!addedLetter) eStatbarLeft.appendChild( Object.assign(document.createElement('p'), {
		// className : 'subtitle',
		textContent : '[no letters added to quick-copy bar]'
	}) );
};
const updateQuickCopyBar = () => {
	// if (!file.isOpen) return;
	let alphabet = lexicon.L2.alph.split(' ');
	for (let i = 0; i < alphabet.length; i++) {
		const e = document.querySelector(`#quick-copy-${i}`);
		if (e) e.textContent = (shiftDown) ? capitalize(alphabet[i]) : alphabet[i];
	}
};

const registerInput = (container,id,onUpdate) => {
	// registering input allows quick-copy bar to paste characters into it, and allows optional onUpdate()
	// passing (container,id) allows fetching target element even if original has been replaced
	// will need to rerun if container gets replaced
	// TODO: optimization pass, check if mem leak occurs if container is rebuilt
	container.querySelector(id).onfocus = () => activeInput = container.querySelector(id); // TODO: clear activeInput whenever an input is removed/replaced; esp check for e.innerHTML=''
	if (onUpdate) {
		container.querySelector(id).onblur = onUpdate;
		// TODO: [Enter] submission temporarily blocked to allow new lines in textareas; add arg to toggle this on/off
		// container.querySelector(id).onkeydown = (evt) => {
		// 	switch (evt.key) {
		// 		case 'Enter': // allow [Enter] to submit textbox as if it's a form
		// 		// case 'Escape':
		// 			container.querySelector(id).blur();
		// 			break;
		// 	}
		// 	// TODO: possibly allow arrow keys to navigate from here
		// };
	}
	// console.log(`Registered input "${id}"`);
};
const populateProjectTab = () => {
	// language data
	registerInput(tabContent[TAB_PROJECT], '#lang-name', () => {
		const e = tabContent[TAB_PROJECT].querySelector('#lang-name');
		if (lexicon.L2.name === e.value) return;
		console.log(`Lang name changed from "${lexicon.L2.name}" to "${e.value}".`);
		lexicon.L2.name = e.value;
		markModified();
		markUpdated('languageName');
	});
	registerInput(tabContent[TAB_PROJECT], '#lang-abbr', () => {
		const e = tabContent[TAB_PROJECT].querySelector('#lang-abbr');
		if (lexicon.L2.abbr === e.value) return;
		console.log(`Lang abbr changed from "${lexicon.L2.abbr}" to "${e.value}".`);
		lexicon.L2.abbr = e.value;
		markModified();
		markUpdated('languageAbbr');
		tryLoadEntry(project.activeEntry, true); // TODO: only need refresh sentences; renderAllSentences()/etc need to check if entry loaded
	});
	registerInput(tabContent[TAB_PROJECT], '#lang-alph', () => {
		const e = tabContent[TAB_PROJECT].querySelector('#lang-alph');
		if (lexicon.L2.alph === e.value) return;
		console.log(`Lang alph changed from "${lexicon.L2.alph}" to "${e.value}".`);
		lexicon.L2.alph = e.value;
		markModified();
		markUpdated('languageAlph');
		populateQuickCopyBar();
	});
	registerInput(tabContent[TAB_PROJECT], '#project-authors', () => {
		const e = tabContent[TAB_PROJECT].querySelector('#project-authors');
		if (project.authorship === e.value) return;
		console.log(`Authorship info changed from "${project.authorship}" to "${e.value}".`);
		project.authorship = e.value;
		markModified();
		markUpdated('languageAuth');
	});
	renderProjectInfo();
	// project statistics
	renderProjectStats();
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L1').onclick = () => searchTag('has:L1');
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L2').onclick = () => searchTag('has:L2');
	tabContent[TAB_PROJECT].querySelector('#project-stats-sentence-count').onclick = () => searchTag('has:sentence');
	tabContent[TAB_PROJECT].querySelector('#project-stats-notes-count').onclick = () => searchTag('has:note');
	tabContent[TAB_PROJECT].querySelector('#project-stats-audio-count').onclick = () => searchTag('has:audio');
	tabContent[TAB_PROJECT].querySelector('#project-stats-image-count').onclick = () => searchTag('has:image');
	// project catgs
	populateProjectCatgs();
};

// clear search tab, then run search for specified tag
const searchTag = (tag) => {
	console.log(`Search tab "${tag}"`);
	// switch tabs
	renderTab(TAB_SEARCH);
	// clear search
	searchSettings.reset();
	searchSettings.set(tag);
	renderSearchFilters();
	tabContent[TAB_SEARCH].querySelector(`#search-bar > input`).value = '';
	// load results by clicking submit button, since calling form.submit() reloads page inspite of event.preventDefault())
	tabContent[TAB_SEARCH].querySelector(`#search-bar > button`).click();
	// tabContent[TAB_SEARCH].querySelector(`#search-bar`).submit();
};

const renderProjectInfo = () => {
	tabContent[TAB_PROJECT].querySelector('#lang-name').value = lexicon.L2.name ?? '';
	tabContent[TAB_PROJECT].querySelector('#lang-abbr').value = lexicon.L2.abbr ?? '';
	tabContent[TAB_PROJECT].querySelector('#lang-alph').value = lexicon.L2.alph ?? '';
	tabContent[TAB_PROJECT].querySelector('#project-authors').value = project.authorship ?? '';
};
const renderProjectStats = () => {
	lexicon.calculateStatistics();
	console.log(lexicon.stats);
	// entry contents
	tabContent[TAB_PROJECT].querySelector('#project-stats-num-entries > span').textContent = lexicon.stats.numEntries ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L1 > span').textContent = lexicon.stats.numWordsL1 ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L2 > span').textContent = lexicon.stats.numWordsL2 ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-sentence-count > span').textContent = lexicon.stats.numSentences ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-notes-count > span').textContent = lexicon.stats.numNotes ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-audio-count > span').textContent = lexicon.stats.numEntriesWithAudio ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-image-count > span').textContent = lexicon.stats.numEntriesWithImage ?? '??';
	// catgs
	const eStatsCatgs = tabContent[TAB_PROJECT].querySelector('#project-stats-catgs');
	eStatsCatgs.innerHTML = '';
	for (let catg in lexicon.stats.catgCounts) {
		let e = document.getElementById('tpl-catg-bubble').content.firstElementChild.cloneNode(true);
			e.title = `Click to search catg:${catg}`;
			e.onclick = () => searchTag(`catg:${catg}`);
			e.querySelector('.catg-bubble-label').textContent = project.catgs[catg] ?? capitalize(catg);
			e.querySelector('.catg-bubble-count').textContent = lexicon.stats.catgCounts[catg] ?? '??';
		eStatsCatgs.appendChild(e);
	}
	let e = document.getElementById('tpl-catg-bubble').content.firstElementChild.cloneNode(true);
		e.title = `Click to search catg:misc`;	
		e.onclick = () => searchTag(`catg:misc`);
		e.querySelector('.catg-bubble-label').textContent = 'MISC';
		e.querySelector('.catg-bubble-count').textContent = lexicon.stats.catgCountMisc;
	eStatsCatgs.appendChild(e);
};
const renderProjectCatgForm = (catg,formNum) => {
	let eCatgSection = tabContent[TAB_PROJECT].querySelector(`#project-catg-${catg}`);
	if (!eCatgSection) { console.error(`No catg form section on page for catg ${catg}. You must run renderProjectCatgs() before renderProjectCatgForm().`); return; }
	let eForm = document.getElementById('tpl-project-catg-form').content.firstElementChild.cloneNode(true);
	// element content
	eForm.querySelector('.catg-form-id').textContent = `Form ${formNum}`;
	eForm.querySelector('.catg-form-name').id = `project-catg-${catg}-form-${formNum}-content`;
	eForm.querySelector('.catg-form-name').value = lexicon.L2.forms[catg][formNum]; // TODO: str ?? '', once we don't need to look for errors visually
	eForm.querySelector('.options-menu').id = `project-catg-${catg}-form-${formNum}-menu`;
	eForm.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt, tabContent[TAB_PROJECT], `#project-catg-${catg}-form-${formNum}-menu`);
	eForm.querySelector('.options-menu > .menu-option-caution').onclick = () => openModalDeleteCatgForm(catg,formNum);
	eCatgSection.querySelector('.project-catg-forms').appendChild(eForm);
	// register events once element is in the DOM
	registerInput(tabContent[TAB_PROJECT], `#project-catg-${catg}-form-${formNum}-content`, () => {
		const e = tabContent[TAB_PROJECT].querySelector(`#project-catg-${catg}-form-${formNum}-content`);
		if (e.value === lexicon.L2.forms[catg][formNum]) return; // exit early if no changes
		console.log(`Catg "${catg}" form ${formNum} modified from "${lexicon.L2.forms[catg][formNum]}" to "${e.value}"`);
		lexicon.L2.forms[catg][formNum] = e.value;
		markModified();
		markUpdated('languageForms');
		tryLoadEntry(project.activeEntry, true); // force reload active entry so that form selectors are rebuilt
	});
};

const populateProjectCatgs = () => {
	// header
	tabContent[TAB_PROJECT].querySelector('#project-new-catg').onclick = () => {
		// open modal
		console.log('Creating new catg...');
		openModalCreateCatg();
	};
	// alphabetize catgs
	let orderedCatgs = [];
	for (let catg in project.catgs) orderedCatgs.push(catg);
	orderedCatgs.sort();
	// build catg sections
	const eProjectForms = tabContent[TAB_PROJECT].querySelector('#project-forms');
	if (orderedCatgs.length > 0) eProjectForms.innerHTML = '';
	for (let catg of orderedCatgs) {
		let eCatgSection = document.getElementById('tpl-project-catg').content.firstElementChild.cloneNode(true);
		eCatgSection.id = `project-catg-${catg}`;
		eCatgSection.querySelector('.icon-plus').title = `Add new form for catg "${catg}"`;
		eCatgSection.querySelector('.icon-plus').onclick = () => {
			console.log(`Add new form for catg "${catg}"`);
			lexicon.L2.forms[catg].push('');
			markModified();
			markUpdated('languageForms');
			renderProjectCatgsHeader();
			renderProjectCatg(catg);
		};
		eCatgSection.querySelector('.options-menu').id = `project-catg-${catg}-menu`;
		eCatgSection.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt, tabContent[TAB_PROJECT], `#project-catg-${catg}-menu`);
		eCatgSection.querySelector('.options-menu > .menu-option-standard').onclick = () => openModalEditCatg(catg);
		eCatgSection.querySelector('.options-menu > .menu-option-caution').onclick = () => openModalDeleteCatg(catg);
		eProjectForms.appendChild(eCatgSection);
	}
	// auto-render
	renderProjectCatgs();
};
const renderProjectCatgsHeader = () => {
	let numCatgs = 0;
	let numFormsTotal = 0;
	for (let catg in project.catgs) {
		numCatgs++;
		for (let form of lexicon.L2.forms[catg]) {
			if (form !== undefined) numFormsTotal++;
			// console.log(`CATG HEADER: catg ${catg}, form ${form}`);
		}
	}
	tabContent[TAB_PROJECT].querySelector('#project-forms-header > p').textContent = `${numCatgs} catgs defined (${numFormsTotal} total forms)`;
};
const renderProjectCatgs = () => {
	// alphabetize catgs
	let orderedCatgs = [];
	for (let catg in project.catgs) orderedCatgs.push(catg);
	orderedCatgs.sort();
	// render
	renderProjectCatgsHeader();
	// TODO: this prob doesn't need to use ordered catgs
	for (let catg of orderedCatgs) {
		// console.log(`Rendering project catg section for "${catg}"`);
		renderProjectCatg(catg);
	}
};
const renderProjectCatg = (catg) => {
	const eCatgSection = tabContent[TAB_PROJECT].querySelector(`#project-catg-${catg}`);
	if (!eCatgSection) { console.error(`Section for catg "${catg}" not instantiated. Must call populateProjectCatgs() before rendering catg sections.`); return; }
	let numForms = 0;
	for (let form of lexicon.L2.forms[catg]) {
		if (form !== undefined) numForms++;
	}
	// section header
	eCatgSection.querySelector('.project-catg-name').textContent = capitalize(project.catgs[catg] || catg || '---');
	eCatgSection.querySelector('.project-catg-abbr').textContent = `${catg}.`;
	eCatgSection.querySelector('.project-catg-formcount').textContent = `(${numForms} form${(numForms===1)?'':'s'})`;
	// section forms
	eCatgSection.querySelector('.project-catg-forms').innerHTML = (numForms > 0)
		? '' // if we have forms to render, clear prev contents
		: `<div class='flex-row'><p class='project-catg-no-forms'>[no forms]</p></div>`; // if we have no forms to render, say so
	for (let formNum = 0; formNum < lexicon.L2.forms[catg].length; formNum++) {
		if (lexicon.L2.forms[catg][formNum] !== undefined) renderProjectCatgForm(catg,formNum);
	}
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
const setLexiconSearchIndex = (searchL2) => {
	if (!!searchL2 === !!search.searchL2) return; // truthiness check: don't rebuild stuff if new val same as old val
	search.searchL2 = !!searchL2;
	tabContent[TAB_LEXICON].querySelector('#lexicon-search').value = '';
	if (!search.searchL2) {
		tabContent[TAB_LEXICON].querySelector('#lexicon-search').placeholder = 'Search L1...';
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-L1').classList.add('active');
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-L2').classList.remove('active');
		populateLexicon();
	} else {
		tabContent[TAB_LEXICON].querySelector('#lexicon-search').placeholder = 'Search L2...';
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-L1').classList.remove('active');
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-L2').classList.add('active');
		populateLexicon();
	}
	tabContent[TAB_LEXICON].querySelector('#lexicon-search').focus();
};
const clearLexiconSearch = () => {
	tabContent[TAB_LEXICON].querySelector('#lexicon-search').value = '';
	tabContent[TAB_LEXICON].querySelector('#lexicon-search').focus();
	filterLexicon();
};
const populateLexicon = () => {
	const t0_buildLexicon = performance.now();
	const searchIndex = (search.searchL2) ? 'orderedL2' : 'orderedL1';
	const eLexicon = tabContent[TAB_LEXICON].querySelector('#lexicon-content');
	eLexicon.innerHTML = '';
	for (let i = 0; i < lexicon[searchIndex].length; i++) {
		let e = Object.assign(document.getElementById('tpl-lexicon-entry').content.firstElementChild.cloneNode(true), {
			id : `lexicon-entry-${i}`,
			title : `Entry ID ${lexicon[searchIndex][i].entryId}`,
			onclick : async () => {
				console.log(`Clicked item ${i}. Loading entry ${lexicon[searchIndex][i].entryId}...`);
				await tryLoadEntry(lexicon[searchIndex][i].entryId);
			}
		});
		// console.log(`${lexicon[searchIndex][i].entryId} (${project.activeEntry})`);
		if (project.activeEntry === lexicon[searchIndex][i].entryId) e.classList.add('active-entry');
		e.querySelector('.lexicon-entry-catg').title = project.catgs[lexicon[searchIndex][i].catg] || capitalize(lexicon[searchIndex][i].catg);
		e.querySelector('.lexicon-entry-catg').textContent = capitalize(lexicon[searchIndex][i].catg) || '---';
		e.querySelector('.lexicon-entry-word').textContent = lexicon[searchIndex][i].word || '---';
		if (lexicon[searchIndex][i].hasImage) {
			e.querySelector('.flex-row .icon:nth-child(1)').classList.add('icon-image');
			e.querySelector('.flex-row .icon:nth-child(1)').title = 'Has image';
		}
		if (lexicon[searchIndex][i].hasAudio) {
			e.querySelector('.flex-row .icon:nth-child(2)').classList.add('icon-audio');
			e.querySelector('.flex-row .icon:nth-child(2)').title = 'Has audio';
		}
		eLexicon.appendChild(e);
	}
	const eNoResults = document.createElement('p');
	Object.assign(eNoResults, {
		id : `lexicon-no-entries`,
		textContent : `No results...`
	});
	eNoResults.style.display = 'none';
	eLexicon.appendChild(eNoResults);
	tabContent[TAB_LEXICON].querySelector('#lexicon-num-entries').textContent = `${lexicon[searchIndex].length} Results`;
	console.log(`Lexicon built in ${Math.round(performance.now()-t0_buildLexicon)} ms.`);
};
const updateLexiconActiveEntry = (newActiveEntry) => {
	// must run before updating project.activeEntry
	const searchIndex = (search.searchL2) ? 'orderedL2' : 'orderedL1';
	const eLexicon = tabContent[TAB_LEXICON].querySelector('#lexicon-content');
	for (let i = 0; i < lexicon[searchIndex].length; i++) {
		if (lexicon[searchIndex][i].entryId === project.activeEntry) {
			eLexicon.querySelector(`#lexicon-entry-${i}`).classList.remove('active-entry');
		}
		if (lexicon[searchIndex][i].entryId === newActiveEntry) {
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
	const searchIndex = (search.searchL2) ? 'orderedL2' : 'orderedL1';
	let numResults = 0;
	for (let i = 0; i < lexicon[searchIndex].length; i++) {
		if (frag.test(lexicon[searchIndex][i].word)) {
			numResults++;
			tabContent[TAB_LEXICON].querySelector(`#lexicon-entry-${i}`).style.display = ''; // empty string defaults to original value
		} else {
			tabContent[TAB_LEXICON].querySelector(`#lexicon-entry-${i}`).style.display = 'none';
		}
	}
	tabContent[TAB_LEXICON].querySelector(`#lexicon-no-entries`).style.display = (numResults === 0) ? '' : 'none'; // empty string defaults to original value
	tabContent[TAB_LEXICON].querySelector('#lexicon-num-entries').textContent = (numResults === lexicon[searchIndex].length) ? `${lexicon[searchIndex].length} Results` : `${numResults}/${lexicon[searchIndex].length} Results`;
	console.log(`Lexicon filtered in ${Math.round(performance.now()-t0_search)} ms.`);
};

const renderEditorHeader = () => {
	// console.log(activeEntry.L1);
	tabContent[TAB_LEXICON].querySelector('#entry-L1-label').textContent = `${lexicon.L1.name || 'L1'} Word(s)`;
	tabContent[TAB_LEXICON].querySelector('#entry-L1').value = activeEntry.L1;
	registerInput(tabContent[TAB_LEXICON], '#entry-L1', () => {
		const newL1 = tabContent[TAB_LEXICON].querySelector('#entry-L1').value.split(RE_SYNONYM_SPLITTER).join(SYNONYM_JOIN);
		console.log(`Entry L1 modified from "${activeEntry.L1}" to "${newL1}".`);
		if (newL1 !== activeEntry.L1) {
			activeEntry.L1 = newL1;
			markModified();
			markUpdated('lexiconL1');
			lexicon.indexLexicon(true);
			populateLexicon();
		}
	});
	tabContent[TAB_LEXICON].querySelector('#entry-catg').textContent = project.catgs[activeEntry.catg] ?? capitalize(activeEntry.catg);
	tabContent[TAB_LEXICON].querySelector('#entry-image').onclick = () => openModalManageImages(lexicon.data[project.activeEntry]);
	if (activeEntry.images?.length > 0) {
		// use absolute path for bg img, since we don't know where project folder is relative to lexpad folder
		// can't use RegExp.escape() cuz it's too aggro and CSS doesn't un-escape all the chars
		const url = `${file.path}\\${activeEntry.images[0]}`.replaceAll('\\','\\\\'); // need double escape for CSS parser
		console.log(`Loading entry image "${url}"`);
		tabContent[TAB_LEXICON].querySelector('#entry-image').style.backgroundImage = `url("${url}")`;
		tabContent[TAB_LEXICON].querySelector('#entry-image').textContent = ''; // remove "No Image" text
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-image').style.backgroundImage = ``;
		tabContent[TAB_LEXICON].querySelector('#entry-image').textContent = 'No Image';
	}
};
const renderAllWordforms = () => {
	// TODO: make sure an entry is active before executing
	tabContent[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
	if (activeEntry.L2.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = `<div class='entry-section-no-content'>No Wordforms</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.L2.length; i++) renderWordform(i);
	}
};
const renderAllSentences = () => {
	// TODO: make sure an entry is active before executing
	tabContent[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sents.length})`;
	if (activeEntry.sents.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = `<div class='entry-section-no-content'>No Sentences</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.sents.length; i++) renderSentence(i);
	}
};
const renderAllNotes = () => {
	// TODO: make sure an entry is active before executing
	tabContent[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
	if (activeEntry.notes.length === 0) {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = `<div class='entry-section-no-content'>No Notes</div>`;
	} else {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
		for (let i = 0; i < activeEntry.notes.length; i++) renderNote(i);
	}
};

const renderWordform = i => {
	if (!activeEntry) { console.warn(`No entry active. Failed to render wordform.`); return; } // make sure an entry is active before executing
	let e = document.getElementById('tpl-entry-wordform').content.cloneNode(true);
	// form select
	e.querySelector('select').replaceWith( document.querySelector('#tpl-form-select').content.cloneNode(true) );
	Object.assign(e.querySelector('select'), {
		id : `entry-form-${i}-selector`,
		value : activeEntry.L2[i].form ?? -1,
		onchange : () => {
			// NOTE: changes made here should also be applied to form select onchange() in renderSentence()
			if (document.getElementById(`entry-form-${i}-selector`).value === '+') {
				console.log(`Add New Form, triggered by wordform ${i}`);
				openModalCreateForm(activeEntry.catg,activeEntry.L2[i]); // marks modified/updated if successful
			} else {
				activeEntry.L2[i].form = document.getElementById(`entry-form-${i}-selector`).value;
				markModified();
				markUpdated('languageForms');
			}
		}
	});
	// word input
	Object.assign(e.querySelector('input'), {
		id : `entry-form-${i}-content`,
		value : activeEntry.L2[i].L2 ?? ''
	});
	// audio
	if (activeEntry.L2[i].audio?.length > 0) {
		const eAudioGallery = e.querySelector('.audio-gallery');
		eAudioGallery.innerHTML = '';
		for (let audio of activeEntry.L2[i].audio.slice(0,3)) {
			const url = `${file.path}\\${audio}`.replaceAll('\\','\\\\');
			eAudioGallery.appendChild( Object.assign(document.createElement('button'), {
				className : 'icon icon-audio hover-grey',
				title : audio,
				onclick : () => {
					console.log(`Entry ${project.activeEntry} wordform ${i} playing audio "${url}".`);
					audioPlayer.play(url);
				}
			}) );
		}
	}
	e.querySelector('.audio-gallery-wrapper > .icon-plus').onclick = async () => {
		const hadNoAudio = (!Array.isArray(activeEntry.L2[i].audio) || activeEntry.L2[i].audio.length === 0);
		console.log(activeEntry.L2[i].audio);
		if (!(await addAudioTo(activeEntry.L2[i]))) return; // addAudioTo() marks project modified if at least one file was added
		// markModified();
		markUpdated('lexiconAudio');
		console.log(activeEntry.L2[i].audio);
		renderAllWordforms(); // refresh entire section for simplicity
		// only rebuild lexicon if we just added the first audio
		if (hadNoAudio) {
			// TODO: should be a targetted refresh once that's available
			lexicon.indexLexicon(true);
			populateLexicon();
		}
	};
	// menu
	e.querySelector('.options-menu').id = `entry-form-${i}-menu`;
	e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt, tabContent[TAB_LEXICON], `#entry-form-${i}-menu`);
	e.querySelector('.options-menu > .menu-option-standard').onclick = () => {
		console.log(`Trigger modal: manage audio for wordform ${i}`);
		openModalManageAudio(activeEntry.L2[i]);
	};
	e.querySelector('.options-menu > .menu-option-caution').onclick = () => {
		console.log(`Trigger modal: delete wordform ${i}`);
		openModalDeleteWordform(i);
	};

	// events
	tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').appendChild(e);
	registerInput(tabContent[TAB_LEXICON], `#entry-form-${i}-content`, () => {
		const newL2 = tabContent[TAB_LEXICON].querySelector(`#entry-form-${i}-content`).value.split(RE_SYNONYM_SPLITTER).join(SYNONYM_JOIN);
		console.log(`Entry L2 modified from "${activeEntry.L2[i].L2}" to "${newL2}".`);
		if (newL2 !== activeEntry.L2[i].L2) {
			activeEntry.L2[i].L2 = newL2;
			markModified();
			markUpdated('lexiconL2');
			lexicon.indexLexicon(true);
			populateLexicon();
		}
	});
};
const renderSentence = i => {
	// TODO: make sure an entry is active before executing
	let e = document.getElementById('tpl-entry-sentence').content.cloneNode(true);
	// form select
	e.querySelector('select').replaceWith( document.querySelector('#tpl-form-select').content.cloneNode(true) );
	Object.assign(e.querySelector('select'), {
		id : `entry-sentence-${i}-selector`,
		value : activeEntry.sents[i].form ?? -1,
		onchange : () => {
			// NOTE: changes made here should also be applied to form select onchange() in renderWordform()
			if (document.getElementById(`entry-sentence-${i}-selector`).value === '+') {
				console.log(`Add New Form, triggered by sentence ${i}`);
				openModalCreateForm(activeEntry.catg,activeEntry.sents[i]); // marks modified/updated if successful
			} else {
				activeEntry.sents[i].form = document.getElementById(`entry-sentence-${i}-selector`).value;
				markModified();
				markUpdated('languageForms');
			}
		}
	});
	// audio
	if (activeEntry.sents[i].audio?.length > 0) {
		const eAudioGallery = e.querySelector('.audio-gallery');
		eAudioGallery.innerHTML = '';
		// TODO: only render first 3 audio
		for (let audio of activeEntry.sents[i].audio) {
			const url = `${file.path}\\${audio}`.replaceAll('\\','\\\\');
			let eAudio = document.createElement('button');
			eAudio.classList.add('icon');
			eAudio.classList.add('icon-audio');
			eAudio.classList.add('hover-grey');
			eAudio.title = audio;
			eAudio.onclick = () => {
				console.log(`Entry ${i} playing audio "${url}".`);
				audioPlayer.play(url);
			};
			eAudioGallery.appendChild(eAudio);
		}
	}
	e.querySelector('.audio-gallery-wrapper > .icon-plus').onclick = async () => {
		const hadNoAudio = (!Array.isArray(activeEntry.sents[i].audio) || activeEntry.sents[i].audio.length === 0);
		console.log(activeEntry.sents[i].audio);
		if (!(await addAudioTo(activeEntry.sents[i]))) return; // addAudioTo() marks project modified if at least one file was added
		// markModified();
		markUpdated('lexiconAudio');
		console.log(activeEntry.sents[i].audio);
		renderAllSentences(); // refresh entire section for simplicity
		// only rebuild lexicon if we just added the first audio
		if (hadNoAudio) {
			// TODO: should be a targetted refresh once that's available
			lexicon.indexLexicon(true);
			populateLexicon();
		}
	};
	// sentences
	e.querySelector('.entry-sentence-label-L1').textContent = capitalize(lexicon.L1.abbr || 'L1');
	e.querySelector('.entry-sentence-label-L2').textContent = capitalize(lexicon.L2.abbr || 'L2');
	Object.assign(e.querySelector('.entry-sentence-L1'), {
		id : `entry-sentence-${i}-L1`,
		value : activeEntry.sents[i].L1
	});
	Object.assign(e.querySelector('.entry-sentence-L2'), {
		id : `entry-sentence-${i}-L2`,
		value : activeEntry.sents[i].L2
	});
	// menu
	e.querySelector('.options-menu').id = `entry-sentence-${i}-menu`;
	e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt, tabContent[TAB_LEXICON], `#entry-sentence-${i}-menu`);
	e.querySelector('.options-menu > .menu-option-standard').onclick = () => {
		console.log(`Trigger modal: manage audio for sentence ${i}`);
		openModalManageAudio(activeEntry.sents[i]);
	};
	e.querySelector('.options-menu > .menu-option-caution').onclick = () => {
		console.log(`Trigger modal: delete sentence ${i}`);
		openModalDeleteSentence(i);
	};

	// events
	tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').appendChild(e);
	registerInput(tabContent[TAB_LEXICON], `#entry-sentence-${i}-L1`, () => {
		activeEntry.sents[i].L1 = document.getElementById(`entry-sentence-${i}-L1`).value;
		markModified();
		markUpdated('lexiconSentenceL1');
		console.log(activeEntry.sents[i]);
	});
	registerInput(tabContent[TAB_LEXICON], `#entry-sentence-${i}-L2`, () => {
		activeEntry.sents[i].L2 = document.getElementById(`entry-sentence-${i}-L2`).value;
		markModified();
		markUpdated('lexiconSentenceL2');
		console.log(activeEntry.sents[i]);
	});
};
const renderNote = i => {
	// TODO: make sure an entry is active before executing
	let e = document.getElementById('tpl-entry-note').content.cloneNode(true);
	e.querySelector('p').textContent = `Note #${i+1}`;
	e.querySelector('.icon-x').onclick = () => {
		console.log(`Trigger modal: delete note ${i}`);
		openModalDeleteNote(i);
	};
	Object.assign(e.querySelector('textarea'), {
		id : `entry-note-${i}`,
		value : activeEntry.notes[i].note
	});
	// events
	tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').appendChild(e);
	registerInput(tabContent[TAB_LEXICON], `#entry-note-${i}`, () => {
		activeEntry.notes[i].note = document.getElementById(`entry-note-${i}`).value;
		markModified();
		markUpdated('lexiconNotes');
		console.log(activeEntry.notes[i]);
	});
};

const addWordform = () => {
	if (!activeEntry) return false;
	// add wordform
	if (!Array.isArray(activeEntry.L2)) activeEntry.L2 = [];
	activeEntry.L2.push({ form : -1, L2 : "" });
	markModified();
	// refresh UI
	if (activeEntry.L2.length === 1) {
		// if this is the first wordform, remove the "No Wordforms" message
		tabContent[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = '';
	}
	renderWordform(activeEntry.L2.length - 1);
	tabContent[TAB_LEXICON].querySelector(`#entry-form-${activeEntry.L2.length - 1}-content`).focus();
	tabContent[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
	return true;
};
const addSentence = () => {
	if (!activeEntry) return false;
	// add sentence
	if (!Array.isArray(activeEntry.sents)) activeEntry.sents = [];
	activeEntry.sents.push({ form : -1, L1 : "", L2 : "" });
	markModified();
	// refresh UI
	if (activeEntry.sents.length === 1) {
		// if this is the first sentence, remove the "No Sentences" message
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
	}
	renderSentence(activeEntry.sents.length - 1);
	tabContent[TAB_LEXICON].querySelector(`#entry-sentence-${activeEntry.sents.length - 1}-L2`).focus();
	tabContent[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sents.length})`;
	return true;
};
const addNote = () => {
	if (!activeEntry) return false;
	// add note
	if (!Array.isArray(activeEntry.notes)) activeEntry.notes = [];
	activeEntry.notes.push({ form : -1, note : "" });
	markModified();
	// refresh UI
	if (activeEntry.notes.length === 1) {
		// if this is the first note, remove the "No Notes" message
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
	}
	renderNote(activeEntry.notes.length - 1);
	tabContent[TAB_LEXICON].querySelector(`#entry-note-${activeEntry.notes.length - 1}`).focus();
	tabContent[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
	return true;
};



// search tab
const populateSearchTab = () => {
	// reset searchbar/header
	tabContent[TAB_SEARCH].querySelector('#search-query').value = '';
	tabContent[TAB_SEARCH].querySelector('#search-display-full').onclick = () => {
		searchSettings.showFullResults = true;
		tabContent[TAB_SEARCH].querySelector('#search-display-full').classList.add('active');
		tabContent[TAB_SEARCH].querySelector('#search-display-adaptive').classList.remove('active');
	};
	tabContent[TAB_SEARCH].querySelector('#search-display-adaptive').onclick = () => {
		searchSettings.showFullResults = false;
		tabContent[TAB_SEARCH].querySelector('#search-display-full').classList.remove('active');
		tabContent[TAB_SEARCH].querySelector('#search-display-adaptive').classList.add('active');
	};
	tabContent[TAB_SEARCH].querySelector('#search-display-adaptive').click(); // quick and dirty reset of full/adaptive UI and related vars

	// reset filters
	populateSearchFilters(); // automatically renders UI
	for (let filter in searchSettings.and) {
		tabContent[TAB_SEARCH].querySelector(`#search-and-${filter}`).onclick = () => {
			searchSettings.and[filter] = true;
			tabContent[TAB_SEARCH].querySelector(`#search-and-${filter}`).classList.add('active');
			tabContent[TAB_SEARCH].querySelector(`#search-or-${filter}`).classList.remove('active');
		};
		tabContent[TAB_SEARCH].querySelector(`#search-or-${filter}`).onclick = () => {
			searchSettings.and[filter] = false;
			tabContent[TAB_SEARCH].querySelector(`#search-and-${filter}`).classList.remove('active');
			tabContent[TAB_SEARCH].querySelector(`#search-or-${filter}`).classList.add('active');
		};
		tabContent[TAB_SEARCH].querySelector(`#search-or-${filter}`).click(); // quick and dirty reset of AND/OR UI and related vars
	}
	for (let filter in searchSettings.filters) {
		tabContent[TAB_SEARCH].querySelector(`#search-reset-${filter}`).onclick = () => {
			searchSettings.resetFilter(filter);
			renderSearchFilters();
		};
	}

	// clear search results header
	tabContent[TAB_SEARCH].querySelector('#search-results-header-left').textContent = '';
	tabContent[TAB_SEARCH].querySelector('#search-results-header-right').textContent = 'No active search';
	// clear search results
	tabContent[TAB_SEARCH].querySelector('#search-results').innerHTML = '';
	tabContent[TAB_SEARCH].querySelector('#search-results').appendChild( document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true) );
	tabContent[TAB_SEARCH].querySelector('#search-results .window-status p').textContent = 'Submit a search to get started';
};
const populateSearchFilters = () => {
	// rebuild search filters object
	let tplSearchFilters = {
		in : { L1 : TAG_N, L2 : TAG_N, sentL1 : TAG_N, sentL2 : TAG_N, note : TAG_N },
		catg : {},
		has : { L1 : TAG_N, L2 : TAG_N, sentence : TAG_N, note : TAG_N, audio : TAG_N, image : TAG_N }
	};
	let catgs = Object.keys(project.catgs).sort();
	catgs.push('misc');
	for (let catg of catgs) tplSearchFilters.catg[catg] = TAG_N;
	searchSettings.filters = tplSearchFilters; // no need to call searchSettings.reset(), since new filters obj already "zeroed out"
	
	// rebuild catg section of search tab
	const eSearchCatgs = tabContent[TAB_SEARCH].querySelector('#search-section-catgs');
	eSearchCatgs.innerHTML = '';
	for (let catg in searchSettings.filters.catg) {
		let e = document.getElementById('tpl-search-tag').content.firstElementChild.cloneNode(true);
			e.id = `tag-catg-${catg}`;
			e.querySelector('p').textContent = `catg:${catg}`;
		eSearchCatgs.appendChild(e);
	}
	// render changes
	renderSearchFilters();

	// attach event listeners to filter UI
	for (let filter in searchSettings.filters) {
		for (let qualifier in searchSettings.filters[filter]) {
			tabContent[TAB_SEARCH].querySelector(`#tag-${filter}-${qualifier}`).onclick = () => {
				searchSettings.setNext(`${filter}:${qualifier}`);
				renderSearchFilters();
			};
		}
	}
};
const renderSearchFilters = () => {
	for (let filter in searchSettings.filters) {
		for (let qualifier in searchSettings.filters[filter]) {
			const e = tabContent[TAB_SEARCH].querySelector(`#tag-${filter}-${qualifier}`);
			switch (searchSettings.filters[filter][qualifier]) {
				case TAG_F:
					e?.classList.remove('include');
					e?.classList.add('exclude');
					if (e) e.title = `Excluding ${filter}:${qualifier}`;
					break;
				case TAG_N:
					e?.classList.remove('include');
					e?.classList.remove('exclude');
					if (e) e.title = `Tag is inactive`;
					break;
				case TAG_T:
					e?.classList.add('include');
					e?.classList.remove('exclude');
					if (e) e.title = `Including ${filter}:${qualifier}`;
					break;
				default: console.error(`Cannot render tag ${filter}:${qualifier}, value out of bounds.`);
			}
		}
	}
};

// analysis tab
const populateAnalysisTab = () => {
	// media checker refresh button
	tabContent[TAB_ANALYSIS].querySelector('#analysis-refresh-media-checker').onclick = () => {
		renderAnalysisMediaUsage(true);
		checkUpdatesAnalysisTab();
	};
	// media checker
	Object.assign(tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-missing-images'), {
		title : `Supported image formats: ${lexicon.SUPPORTED_IMAGES.join(', ')}`,
		onclick : () => {
			console.log('missing images');
			mediaUsageSection = 'missing-images';
			renderAnalysisMediaUsage();
		}
	});
	Object.assign(tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-missing-audio'), {
		title : `Supported audio formats: ${lexicon.SUPPORTED_AUDIO.join(', ')}`,
		onclick : () => {
			console.log('missing audio');
			mediaUsageSection = 'missing-audio';
			renderAnalysisMediaUsage();
		}
	});
	Object.assign(tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-unused-images'), {
		title : `Supported image formats: ${lexicon.SUPPORTED_IMAGES.join(', ')}`,
		onclick : () => {
			console.log('unused images');
			mediaUsageSection = 'unused-images';
			renderAnalysisMediaUsage();
		}
	});
	Object.assign(tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-unused-audio'), {
		title : `Supported audio formats: ${lexicon.SUPPORTED_AUDIO.join(', ')}`,
		onclick : () => {
			console.log('unused audio');
			mediaUsageSection = 'unused-audio';
			renderAnalysisMediaUsage();
		}
	});
	tabContent[TAB_ANALYSIS].querySelector('#analysis-export-media-selected-section').onclick = () => {
		console.log(`Export current section: "${mediaUsageSection}"`);
		switch (mediaUsageSection) {
			case 'missing-images': exportTextFile( setListStr('Missing Images',lexicon.media.imagesMissing) ); break;
			case 'missing-audio': exportTextFile( setListStr('Missing Audio',lexicon.media.audioMissing) ); break;
			case 'unused-images': exportTextFile( setListStr('Unused Images',lexicon.media.imagesUnused) ); break;
			case 'unused-audio': exportTextFile( setListStr('Unused Audio',lexicon.media.audioUnused) ); break;
			default: console.warn(`Section is null or unrecognized. Nothing to export.`);
		}
	};
	// media checks combined
	tabContent[TAB_ANALYSIS].querySelector('#analysis-export-media-missing').onclick = () => {
		exportTextFile( `${setListStr('Missing Images',lexicon.media.imagesMissing)}\n\n\n\n${setListStr('Missing Audio',lexicon.media.audioMissing)}` );
	};
	tabContent[TAB_ANALYSIS].querySelector('#analysis-export-media-unused').onclick = () => {
		exportTextFile( `${setListStr('Unused Images',lexicon.media.imagesUnused)}\n\n\n\n${setListStr('Unused Audio',lexicon.media.audioUnused)}` );
	};
	tabContent[TAB_ANALYSIS].querySelector('#analysis-export-media-usage').onclick = () => {
		lexicon.indexMediaUsage(true);
		exportTextFile(
			`${setListStr('Missing Images',lexicon.media.imagesMissing)}\n\n\n\n${setListStr('Missing Audio',lexicon.media.audioMissing)}`
			+ `\n\n\n\n${setListStr('Unused Images',lexicon.media.imagesUnused)}\n\n\n\n${setListStr('Unused Audio',lexicon.media.audioUnused)}`
		);
	};

	// sentence checker refresh button
	tabContent[TAB_ANALYSIS].querySelector('#analysis-refresh-sentence-checker').onclick = () => {
		renderAnalysisSentenceChecker(true);
		checkUpdatesAnalysisTab();
	};

	// auto-select first section
	mediaUsageSection = 'missing-images';
	// render
	renderAnalysisTab(true);
};


const renderAnalysisTab = (needRefreshAll) => {
	// we are free to use Set.size here w/o fear of OBOE, since media indexing process scrubs blank filenames from usage stats

	// // media checks
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-missing-images > span').textContent = lexicon.media.imagesMissing.size;
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-missing-audio > span').textContent = lexicon.media.audioMissing.size;
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-unused-images > span').textContent = lexicon.media.imagesUnused.size;
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-unused-audio > span').textContent = lexicon.media.audioUnused.size;
	// // combined media checks
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-num-missing').textContent = lexicon.media.imagesMissing.size + lexicon.media.audioMissing.size;
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-num-unused').textContent = lexicon.media.imagesUnused.size + lexicon.media.audioUnused.size;
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-num-missing-or-unused').textContent = lexicon.media.imagesMissing.size + lexicon.media.audioMissing.size + lexicon.media.imagesUnused.size + lexicon.media.audioUnused.size;

	// media checker
	renderAnalysisMediaUsage(needRefreshAll);
	// sentence checker
	renderAnalysisSentenceChecker(needRefreshAll);

	console.log(`last update ${Math.round(Math.max(lastUpdate.lexiconL2,lastUpdate.lexiconSentenceL2))}, last render ${Math.round(lastRender.sentenceChecker)}`);
};

let mediaUsageSection = null;
const renderAnalysisMediaUsage = async (needRebuildIndex) => {
	if (needRebuildIndex) {
		// lexicon.indexAvailableMedia();
		console.log(`Media checker rescans assets in ${file.path}`);
		await tryListMedia(`${file.path}\\${file.filename}`);
		lexicon.indexReferencedMedia();
		lexicon.indexMediaUsage(true);
	}
	console.log(`Active media usage section is "${mediaUsageSection}"`);
	// render tabs
	// we are free to use Set.size here w/o fear of OBOE, since media indexing process scrubs blank filenames from usage stats
	for (let section of ['missing-images','missing-audio','unused-images','unused-audio']) {
		if (section === mediaUsageSection) {
			tabContent[TAB_ANALYSIS].querySelector(`#analysis-preview-${section}`).classList.add('active');
		} else {
			tabContent[TAB_ANALYSIS].querySelector(`#analysis-preview-${section}`).classList.remove('active');
		}
	}
	tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-missing-images > span').textContent = lexicon.media.imagesMissing.size;
	tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-missing-audio > span').textContent = lexicon.media.audioMissing.size;
	tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-unused-images > span').textContent = lexicon.media.imagesUnused.size;
	tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-unused-audio > span').textContent = lexicon.media.audioUnused.size;
	// render preview of list
	switch (mediaUsageSection) {
		case 'missing-images':
			tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-media-usage').textContent = setListStr('Missing Images',lexicon.media.imagesMissing);
			break;
		case 'missing-audio':
			tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-media-usage').textContent = setListStr('Missing Audio',lexicon.media.audioMissing);
			break;
		case 'unused-images':
			tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-media-usage').textContent = setListStr('Unused Images',lexicon.media.imagesUnused);
			break;
		case 'unused-audio':
			tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-media-usage').textContent = setListStr('Unused Audio',lexicon.media.audioUnused);
			break;
		default:
			tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-media-usage').textContent = `Select a section to preview it.`;
	}
	// render combined-check buttons
	tabContent[TAB_ANALYSIS].querySelector('#analysis-num-missing').textContent = lexicon.media.imagesMissing.size + lexicon.media.audioMissing.size;
	tabContent[TAB_ANALYSIS].querySelector('#analysis-num-unused').textContent = lexicon.media.imagesUnused.size + lexicon.media.audioUnused.size;
	tabContent[TAB_ANALYSIS].querySelector('#analysis-num-missing-or-unused').textContent = lexicon.media.imagesMissing.size + lexicon.media.audioMissing.size + lexicon.media.imagesUnused.size + lexicon.media.audioUnused.size;
	// register render
	markRendered('mediaChecker');
};
const renderAnalysisSentenceChecker = (needRebuildIndex) => {
	if (needRebuildIndex) {
		lexicon.indexSentences(true);
	}
	const t0_renderSentenceChecker = performance.now();
	// sentence coverage
	console.log(`word inv L2 sentences: size ${lexicon.sentences.wordInventory.size}`);
	console.log(`word inv unrecognized: size ${lexicon.sentences.wordsWithoutCoverage.size}`);
	tabContent[TAB_ANALYSIS].querySelector('#analysis-sentence-coverage').textContent = (100 * (lexicon.sentences.wordInventory.size - lexicon.sentences.wordsWithoutCoverage.size) / lexicon.sentences.wordInventory.size).toFixed(1) ?? 'ERROR';
	tabContent[TAB_ANALYSIS].querySelector('#analysis-uniq-sentence-words').textContent = lexicon.sentences.wordInventory.size ?? 'ERROR';
	tabContent[TAB_ANALYSIS].querySelector('#analysis-unrecognized-words-count').textContent = lexicon.sentences.wordsWithoutCoverage.size ?? 'ERROR';
	tabContent[TAB_ANALYSIS].querySelector('#analysis-uniq-sentence-words-2').textContent = lexicon.sentences.wordInventory.size ?? 'ERROR';
	// unrecognized words
	// tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-sentence-coverage').textContent = [...lexicon.sentences.wordsWithoutCoverage].sort().join('\n');
	tabContent[TAB_ANALYSIS].querySelector('#analysis-preview-sentence-coverage').textContent = setListStr('Unrecognized L2 Words',lexicon.sentences.wordsWithoutCoverage);
	tabContent[TAB_ANALYSIS].querySelector('#analysis-export-sentence-uncovered-words').onclick = () => {
		exportTextFile( setListStr('Unrecognized L2 Words',lexicon.sentences.wordsWithoutCoverage) );
	};
	// ignorelist
	const ignorelist = project.ignorelist.split(/\s+/);
	tabContent[TAB_ANALYSIS].querySelector('#analysis-ignorelist-len').textContent = ignorelist.length;
	tabContent[TAB_ANALYSIS].querySelector('#analysis-ignorelist').textContent = ignorelist.join('\n');
	registerInput(tabContent[TAB_ANALYSIS], '#analysis-ignorelist', () => {
		const ignorelistArr = tabContent[TAB_ANALYSIS].querySelector('#analysis-ignorelist').value.trim().split(/\s+/);
		console.log(ignorelistArr);
		const ignorelistStr = ignorelistArr.join(' ');
		console.log(ignorelistStr);
		if (ignorelistStr === project.ignorelist) return;
		project.ignorelist = ignorelistStr;
		markModified();
		renderAnalysisSentenceChecker(true);
	});
	markRendered('sentenceChecker');
	console.log(`Rendered sentence checker in ${Math.round(performance.now()-t0_renderSentenceChecker)} ms.`);
};

const checkUpdatesAnalysisTab = () => {
	// media checker affected by images and audio
	if (needsUpdate('mediaChecker')) {
		console.log(`Media checker requires refresh.`);
		const e = tabContent[TAB_ANALYSIS].querySelector('#analysis-refresh-media-checker');
		e.textContent = `Click to Re-Scan`;
		e.classList.remove('disabled');
		e.inert = false;
	} else {
		console.log(`Media checker up to date.`);
		const e = tabContent[TAB_ANALYSIS].querySelector('#analysis-refresh-media-checker');
		e.textContent = `Scan Complete!`;
		e.classList.add('disabled');
		e.inert = true;
	}
	// sentence checker affected by wordform L2 and sentence L2
	if (needsUpdate('sentenceChecker')) {
		console.log(`Sentence checker requires refresh.`);
		const e = tabContent[TAB_ANALYSIS].querySelector('#analysis-refresh-sentence-checker');
		e.textContent = `Click to Re-Scan`;
		e.classList.remove('disabled');
		e.inert = false;
	} else {
		console.log(`Sentence checker up to date.`);
		const e = tabContent[TAB_ANALYSIS].querySelector('#analysis-refresh-sentence-checker');
		e.textContent = `Scan Complete!`;
		e.classList.add('disabled');
		e.inert = true;
	}
};



////////////////////////////////////////////////////////////////////////

//// REFRESH EVENTS ////

const refreshLexicon = (needRebuildIndex) => {
	if (needRebuildIndex) lexicon.indexLexicon();
	populateLexicon();
};
const onRefreshCatgs = () => {
	// refresh project tab
	renderProjectStats(); // recalcs lexiconStats and catgCounts
	populateProjectCatgs();
	// refresh lexicon tab
	// TODO: possibly defer this until user next accesses lexicon tab
	lexicon.indexLexicon(true);
	populateLexicon();
	tryLoadEntry(project.activeEntry, true);
	// refresh search tab
	// TODO: possibly defer this until user next accesses lexicon tab
	populateSearchTab();
};
const onAddOrDeleteEntry = (needRefreshCatgs) => {
	// TODO optimization: build a more targetted refresh to save time

	// refresh project tab
	renderProjectStats(); // recalcs lexiconStats and catgCounts
	populateProjectCatgs(); // fully rebuild catg bubbles in case this was the first or last entry of its catg
	// refresh lexicon tab
	lexicon.indexLexicon(true);
	populateLexicon();
	tryLoadEntry(project.activeEntry,true); // should have been set to new entry id if creating, or -1 if deleting
	// refresh search tab
	if (needRefreshCatgs) populateSearchTab();
};

////////////////////////////////////////////////////////////////////////

//// MODALS ////

let isModalOpen = false; // allow [Esc] to close open modal
let isTutorialOpen = false;

const closeModal = () => {
	document.querySelector('#popup-wrapper').inert = true; // make uninteractive
	document.querySelector('#popup-wrapper').classList.add('hidden'); // hide
	document.querySelector('#modal').innerHTML = '[no modal content]'; // reset contents
	document.querySelector('#main').inert = false; // disable focus trap
	// TODO: focus management should return to active tab
	isModalOpen = false;
};
const activateModal = (modal) => {
	if (!modal) return;
	document.querySelector('#popup-wrapper').innerHTML = ''; // clear previous contents, if any
	document.querySelector('#popup-wrapper').appendChild(modal); // add modal to DOM
	document.querySelector('#popup-wrapper').inert = false; // make interactible
	document.querySelector('#popup-wrapper').classList.remove('hidden'); // make visible
	document.querySelector('#main').inert = true; // trap focus
	modal.focus();
	isModalOpen = true;
};
const closeTutorial = () => {
	document.querySelector('#tutorial-wrapper').inert = true; // make uninteractive
	document.querySelector('#tutorial-wrapper').classList.add('hidden'); // hide
	document.querySelector('#tutorial').innerHTML = '[no tutorial content]'; // reset contents
	document.querySelector('#main').inert = false; // disable focus trap
	// TODO: focus management should return to active tab
	isTutorialOpen = false;
};
const activateTutorial = (modal) => {
	if (!modal) return;
	document.querySelector('#tutorial-wrapper').innerHTML = ''; // clear previous contents, if any
	document.querySelector('#tutorial-wrapper').appendChild(modal); // add modal to DOM
	document.querySelector('#tutorial-wrapper').inert = false; // make interactible
	document.querySelector('#tutorial-wrapper').classList.remove('hidden'); // make visible
	document.querySelector('#main').inert = true; // trap focus
	modal.focus();
	isTutorialOpen = true;
};

// keyboard shortcut reference
const openTutorialKeyboardShortcuts = () => {
	const eModal = document.querySelector('#tpl-keyboard-shortcuts').content.firstElementChild.cloneNode(true);
	eModal.querySelector('.icon-x').onclick = () => closeTutorial();
	activateTutorial(eModal);
};

// project management modals
const openModalUnsavedChanges = (takeAction=(choice)=>{}) => {
	const eModal = document.querySelector('#tpl-modal-unsaved-changes').content.firstElementChild.cloneNode(true);
	// set up modal actions
	eModal.querySelector('#modal-action-save').onclick = () => takeAction(0);
	eModal.querySelector('#modal-action-discard').onclick = () => takeAction(1);
	eModal.querySelector('#modal-action-cancel').onclick = () => takeAction(2);
	activateModal(eModal);
};
const openModalCreateProject = () => {
	const eModal = document.querySelector('#tpl-modal-create-project').content.firstElementChild.cloneNode(true);
	// project creation logic
	let dirpath = '';
	let filename = 'database';
	const updateFilepath = (newpath) => {
		dirpath = newpath.replace(/\\+$/,''); // clear trailing slashes
		const lastdir = /\\/.test(dirpath) ? `...\\${dirpath.replace(/^.+\\/,'')}` : dirpath; // (not empty or root) ? "...\projectDir" : raw dirpath
		eModal.querySelector('#modal-create-project-assets').textContent = `${lastdir}\\assets`;
		eModal.querySelector('#modal-create-project-database').textContent = `${lastdir}\\${filename}.json`;
	};
	const submitModal = async () => {
		const res = await tryCreateProject(dirpath, filename);
	};
	// select directory
	eModal.querySelector('#modal-create-project-directory').onblur = () => {
		updateFilepath(eModal.querySelector('#modal-create-project-directory').value);
	};
	eModal.querySelector('#modal-create-project-select-directory').onclick = async () => {
		console.log('Renderer selects directory to create new project in.');
		const res = await window.electronAPI.rendererSelectDirectory();
		console.log(res);
		if (res.canceled) return;
		if (res.error) { console.error(res.message); return; }
		if (res.path) {
			eModal.querySelector('#modal-create-project-directory').value = res.path;
			updateFilepath(res.path);
		}
	};
	// TODO: hook up rename button
	eModal.querySelector('#modal-action-create').onclick = () => submitModal();
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};

// project tab modals
const openModalCreateCatg = () => {
	const eModal = document.querySelector('#tpl-modal-create-catg').content.firstElementChild.cloneNode(true);
	// modal content
		//
	// modal actions
	eModal.querySelector('#modal-action-confirm').onclick = () => {
		const catgName = eModal.querySelector('#modal-catg-name').value;
		const catgAbbr = eModal.querySelector('#modal-catg-abbr').value;
		if (catgName === '' || catgAbbr === '') {
			console.warn('Cannot accept blank catg name or abbreviation. Nothing created.');
			return;
		}
		if (Object.keys(project.catgs).indexOf(catgAbbr) !== -1) {
			console.warn('A catg with this abbreviation already exists. Abbreviations must be unique.');
			return;
		}
		if (!lexicon.createCatg(catgName, catgAbbr)) {
			console.error(`Unable to create catg "${catgName}" with abbreviation "${catgAbbr}".`);
		} else {
			// only mark project modified if we actually succeeded at creating catg
			markModified();
			markUpdated('projectCatgs');
		}
		// refresh UI whether or not catg creation was successful
		onRefreshCatgs(); // render stats, populate catgs, index words, populate lexicon, reload entry, populate search
		closeModal();
		console.log(project.catgs);
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalEditCatg = (prevCatg) => {
	const eModal = document.querySelector('#tpl-modal-create-catg').content.firstElementChild.cloneNode(true);
	// modal content
	eModal.querySelector('.modal-title').textContent = 'Edit Catg';
	eModal.querySelector('#modal-catg-name').value = project.catgs[prevCatg] || '';
	eModal.querySelector('#modal-catg-abbr').value = prevCatg;
	eModal.querySelector('#modal-action-confirm').textContent = 'Save Changes';
	// modal actions
	eModal.querySelector('#modal-action-confirm').onclick = () => {
		const catgName = eModal.querySelector('#modal-catg-name').value;
		const catgAbbr = eModal.querySelector('#modal-catg-abbr').value;
		// const didNameChange = (catgName !== project.catgs[catgAbbr]);
		// const didAbbrChange = (catgAbbr !== prevCatg);
		if (catgName === '' || catgAbbr === '') {
			console.warn('Cannot accept blank catg name or abbreviation. Nothing created.');
			return;
		}
		if (catgAbbr !== prevCatg && Object.keys(project.catgs).indexOf(catgAbbr) !== -1) {
			console.warn('Another catg with this abbreviation already exists. Abbreviations must be unique.');
			return;
		}
		if (catgAbbr === prevCatg && catgName === project.catgs[catgAbbr]) {
			console.log('No changes made to catg.');
			closeModal();
			return;
		}
		const prevCatgName = project.catgs[catgAbbr]; // store old name since it will be deleted if edit is successful
		console.log(`Edit catg: Old name "${prevCatgName}" with abbreviation "${prevCatg}". New name "${catgName}" with abbreviation "${catgAbbr}".`);
		if (!lexicon.editCatg(prevCatg,catgName,catgAbbr)) {
			console.error(`ERROR Failed to edit catg. Old name was "${prevCatgName}" with abbreviation "${prevCatg}". New name was "${catgName}" with abbreviation "${catgAbbr}".`);
		} else {
			// only mark project modified if we actually succeeded at editing catg
			markModified();
			markUpdated('projectCatgs');
		}
		// refresh UI whether or not edit was successful
		onRefreshCatgs(); // render stats, populate catgs, index words, populate lexicon, reload entry, populate search
		closeModal();
		console.log(project.catgs);
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalDeleteCatg = (catgAbbr) => {
	const eModal = document.querySelector('#tpl-modal-delete-catg').content.firstElementChild.cloneNode(true);
	// modal content
	eModal.querySelector('#modal-catg-name').textContent = project.catgs[catgAbbr];
	eModal.querySelector('#modal-catg-abbr').textContent = catgAbbr;
	// modal actions
	eModal.querySelector('#modal-action-confirm').onclick = () => {
		if (!lexicon.deleteCatg(catgAbbr)) {
			console.error(`ERROR Failed to delete catg "${project.catgs[catgAbbr]}" with abbreviation "${catgAbbr}".`);
		} else {
			// only mark project modified if we actually succeeded at deleting catg
			markModified();
			markUpdated('projectCatgs');
		}
		// refresh UI whether or not deletion was successful
		onRefreshCatgs(); // render stats, populate catgs, index words, populate lexicon, reload entry, populate search
		activeMenu.reset(); // need to clear pointer to previously-active menu which just got deleted by refresh
		closeModal();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalDeleteCatgForm = (catgAbbr,formNum) => {
	const eModal = document.querySelector('#tpl-modal-delete-catg-form').content.firstElementChild.cloneNode(true);
	// modal content
	eModal.querySelector('#modal-catg-form-num').textContent = formNum;
	eModal.querySelector('#modal-catg-form-name').textContent = lexicon.L2.forms[catgAbbr][formNum];
	eModal.querySelector('#modal-catg-name').textContent = project.catgs[catgAbbr];
	eModal.querySelector('#modal-catg-abbr').textContent = catgAbbr;
	// modal actions
	eModal.querySelector('#modal-action-confirm').onclick = () => {
		if (!lexicon.deleteForm(catgAbbr,formNum)) {
			console.error(`ERROR Failed to delete form ${formNum} of catg "${project.catgs[catgAbbr]}" (${catgAbbr}).`);
			console.log(project.catgs);
			console.log(lexicon.L2.forms);
		} else {
			// only mark project modified if we actually succeeded at deleting catg
			markModified();
			markUpdated('languageForms');
		}
		// refresh UI whether or not deletion was successful
		renderProjectCatgsHeader();
		renderProjectCatg(catgAbbr);
		activeMenu.reset(); // need to clear pointer to previously-active menu which just got deleted by refresh
		if (activeEntry.catg === catgAbbr) tryLoadEntry(project.activeEntry, true);
		closeModal();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};

// lexicon tab modals
const openModalCreateEntry = () => {
	const eModal = document.querySelector('#tpl-modal-create-entry').content.firstElementChild.cloneNode(true);
	const eSelect = eModal.querySelector('#modal-create-entry-catg');
	// build <select> element
	eSelect.innerHTML = '';
	for (let catg in project.catgs) {
		eSelect.appendChild( Object.assign(document.createElement('option'), {
			value : catg,
			textContent : project.catgs[catg] || capitalize(catg)
		}) );
	}
	eSelect.appendChild( Object.assign(document.createElement('option'), {
		value : '+',
		textContent : '++ Create New Catg ++'
	}) );
	// update logic
	eSelect.onchange = () => {
		if (eSelect.value === '+') {
			console.log('New entry modal: Create new catg');
			eModal.querySelector('#modal-create-entry-new-catg-section').inert = false;
			eModal.querySelector('#modal-create-entry-new-catg-section').classList.remove('hidden');
		} else {
			console.log(`New entry modal: select catg "${eSelect.value}"`);
			eModal.querySelector('#modal-create-entry-new-catg-section').inert = true;
			eModal.querySelector('#modal-create-entry-new-catg-section').classList.add('hidden');
		}
	};
	// modal actions
	eModal.querySelector('#modal-action-create').onclick = () => {
		// create entry and mark project modified
		console.log('Creating new entry...');
		let createdNewCatg = false;
		if (eSelect.value === '+') {
			const catgName = eModal.querySelector('#modal-create-entry-new-catg-name').value;
			const catgAbbr = eModal.querySelector('#modal-create-entry-new-catg-abbr').value.toLowerCase();
			console.log('Creating new catg...');
			if (!lexicon.createCatg(catgName,catgAbbr)) return;
			createdNewCatg = true;
			project.activeEntry = lexicon.createEntry(catgAbbr);
			console.log(`Created entry #${project.activeEntry}`);
		} else {
			project.activeEntry = lexicon.createEntry(eSelect.value);
			console.log(`Created entry #${project.activeEntry}`);
		}
		markModified();
		markUpdated('projectCatgs');
		// refresh UI
		onAddOrDeleteEntry(createdNewCatg); // runs tryLoadEntry(-1);
		closeModal();
		// focus management
		tabContent[TAB_LEXICON].querySelector('#entry-L1').focus();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalDeleteEntry = (entryId) => {
	const eModal = document.querySelector('#tpl-modal-delete-entry').content.firstElementChild.cloneNode(true);
	// modal actions
	eModal.querySelector('#modal-action-delete').onclick = () => {
		if (!lexicon.deleteEntry(entryId)) return;
		activeEntry = null; // clear pointer to deleted entry so it can be garbage collected properly
		// project.activeEntry = -1; // redundant; this gets unset by lexicon.deleteEntry()
		markModified();
		markUpdated(
			'projectCatgs',
			'languageForms',
			'lexiconL1','lexiconL2','lexiconSentenceL1','lexiconSentenceL2','lexiconNotes',
			'lexiconAudio','lexiconImages'
		);
		onAddOrDeleteEntry(false); // needRefreshCatgs = false; deletion doesn't create catg => only partial refresh
		closeModal();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalManageImages = (imageParent) => {
	// const imageParent = lexicon.data[entryId];
	const eModal = document.querySelector('#tpl-modal-manage-images').content.firstElementChild.cloneNode(true);
	// TODO: need to re-scan media in case files have gone missing
	// modal content
	if (!Array.isArray(imageParent.images) || imageParent.images.length === 0) {
		console.log('No images attached yet.');
	} else {
		console.log('Missing images:');
		console.log(lexicon.media.imagesMissing);
		imageParent.images = imageParent.images.filter(x => x).sort(); // scrub blank/deleted filenames since we're already touching datafield
		eModal.querySelector('#modal-num-images').textContent = imageParent.images.length;
		for (let i = 0; i < imageParent.images.length; i++) {
			const eImage = document.querySelector('#tpl-modal-image-tile').content.firstElementChild.cloneNode(true);
			// use absolute path for bg img, since we don't know where project folder is relative to lexpad folder
			// can't use RegExp.escape() cuz it's too aggro and CSS doesn't un-escape all the chars
			const url = `${file.path}\\${imageParent.images[i]}`.replaceAll('\\','\\\\'); // double escape for CSS parser
			eImage.querySelector('.modal-image-thumbnail').title = imageParent.images[i]; // don't need fallback, since imageParent.images was just scrubbed
			eImage.querySelector('.modal-image-thumbnail').style.backgroundImage = `url("${url}")`;
			if (lexicon.media.imagesMissing.has(imageParent.images[i])) {
				console.log(`Image ${i} "${imageParent.images[i]}" is in the list of missing files`);
				eImage.querySelector('p').textContent = `*${imageParent.images[i]}`;
				eImage.querySelector('p').classList.add('warning');
				eImage.querySelector('p').title = 'This file is missing. It was likely moved, deleted, or renamed.';
			} else {
				eImage.querySelector('p').textContent = imageParent.images[i];
			}
			eImage.querySelector('.icon-x').onclick = () => {
				console.log(`Deleting image ${i}: "${imageParent.images[i]}"`);
				imageParent.images.splice(i,1);
				markModified();
				markUpdated('lexiconImages');
				// refresh entry editor in case first image changed
				renderEditorHeader();
				// only rebuild lexicon if we just deleted the last image
				if (imageParent.images.length === 0) {
					// TODO: should be a targetted refresh once that's available
					lexicon.indexLexicon(true);
					populateLexicon();
				}
				// refresh this modal
				openModalManageImages(imageParent);
			}
			eModal.querySelector('#modal-image-manager').appendChild(eImage);
		}
	}
	eModal.querySelector('#modal-add-image').onclick = async () => {
		const hadNoImages = (!Array.isArray(imageParent.images) || imageParent.images.length === 0);
		console.log(imageParent.images);
		if (!(await addImageTo(imageParent))) return; // skip refresh if selection cancelled; will mark project modified if at least one file successfully added
		// markModified(); // addImageTo() marks project modified if successful
		markUpdated('lexiconImages');
		console.log(imageParent.images);
		// refresh entry editor in case first image changed
		renderEditorHeader();
		// only rebuild lexicon if we just added the first image
		if (hadNoImages) {
			// TODO: should be a targetted refresh once that's available
			lexicon.indexLexicon(true);
			populateLexicon();
		}
		// refresh this modal
		openModalManageImages(imageParent);
	};
	// modal actions
	eModal.querySelector('#modal-action-done').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalManageAudio = (audioParent) => {
	const eModal = document.querySelector('#tpl-modal-manage-audio').content.firstElementChild.cloneNode(true);
	// TODO: need to re-scan media in case files have gone missing
	// modal content
	if (!Array.isArray(audioParent.audio) || audioParent.audio.length === 0) {
		console.log('No audio attached yet.');
	} else {
		console.log('Missing audio:');
		console.log(lexicon.media.audioMissing);
		audioParent.audio = audioParent.audio.filter(x => x).sort(); // scrub blank/deleted filenames since we're already touching datafield
		eModal.querySelector('#modal-num-audio').textContent = audioParent.audio.length;
		for (let i = 0; i < audioParent.audio.length; i++) {
			// TODO: switch url to relative paths instead of constructing absolute path
			// can't use RegExp.escape() cuz it's too aggro and CSS doesn't un-escape all the chars
			const url = `${file.path}\\${audioParent.audio[i]}`.replaceAll('\\','\\\\');
			const eAudio = document.querySelector('#tpl-modal-audio-tile').content.firstElementChild.cloneNode(true);
			eAudio.querySelector('.icon-audio').title = audioParent.audio[i]; // don't need fallback, since audioParent.audio was just scrubbed
			eAudio.querySelector('.icon-audio').onclick = () => {
				console.log(`Modal playing audio "${url}".`);
				audioPlayer.play(url);
			};
			if (lexicon.media.audioMissing.has(audioParent.audio[i])) {
				console.log(`Audio ${i} "${audioParent.audio[i]}" is in the list of missing files`);
				eAudio.querySelector('p').textContent = `*${audioParent.audio[i]}`;
				eAudio.querySelector('p').classList.add('warning');
				eAudio.querySelector('p').title = 'This file is missing. It was likely moved, deleted, or renamed.';
			} else {
				eAudio.querySelector('p').textContent = audioParent.audio[i];
			}
			eAudio.querySelector('.icon-x').onclick = () => {
				console.log(`Deleting audio ${i}: "${audioParent.audio[i]}"`);
				audioParent.audio.splice(i,1);
				markModified();
				markUpdated('lexiconAudio');
				// we don't know whether audio was added to wordform or section, so refresh both sections to be safe
				renderAllWordforms();
				renderAllSentences();
				// only rebuild lexicon if we just deleted the last audio
				if (audioParent.audio.length === 0) {
					// TODO: should be a targetted refresh once that's available
					lexicon.indexLexicon(true);
					populateLexicon();
				}
				// refresh this modal
				openModalManageAudio(audioParent);
			}
			eModal.querySelector('#modal-audio-manager').appendChild(eAudio);
		}
	}
	eModal.querySelector('#modal-add-audio').onclick = async () => {
		const hadNoAudio = (!Array.isArray(audioParent.audio) || audioParent.audio.length === 0);
		console.log(audioParent.audio);
		if (!(await addAudioTo(audioParent))) return; // skip refresh if selection cancelled; will mark project modified if at least one file successfully added
		// markModified();
		markUpdated('lexiconAudio');
		console.log(audioParent.audio);
		// we don't know whether audio was added to wordform or section, so refresh both sections to be safe
		renderAllWordforms();
		renderAllSentences();
		// only rebuild lexicon if we just added the first audio
		if (hadNoAudio) {
			// TODO: should be a targetted refresh once that's available
			lexicon.indexLexicon(true);
			populateLexicon();
		}
		// refresh this modal
		openModalManageAudio(audioParent);
	};
	// modal actions
	eModal.querySelector('#modal-action-done').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalDeleteWordform = (formId) => {
	const eModal = document.querySelector('#tpl-modal-delete-wordform').content.firstElementChild.cloneNode(true);
	// modal content
	eModal.querySelector('#modal-wordform').textContent = trim(activeEntry.L2[formId].L2 || '---', MODAL_FOCUS_MAXLEN);
	if (!activeEntry.catg) {
		eModal.querySelector('#modal-wordform-case').textContent = '(entry has no catg)';
	} else if (activeEntry.L2[formId].form >= 0) {
		eModal.querySelector('#modal-wordform-case').textContent = `(${lexicon.L2.forms[activeEntry.catg][activeEntry.L2[formId].form] || `Form ${formId}`})`;
	} else {
		eModal.querySelector('#modal-wordform-case').textContent = '(form unspecified)';
	}
	// modal actions
	eModal.querySelector('#modal-action-delete').onclick = () => {
		console.log(activeEntry.L2);
		console.log(activeEntry.L2[formId]);
		activeEntry.L2.splice(formId,1); // delete data
		markModified();
		markUpdated('languageForms','lexiconL2','lexiconAudio');
		renderAllWordforms();
		activeMenu.reset(); // clear pointer to old hiding menu, since it just got deleted from the DOM
		closeModal();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalDeleteSentence = (sentId) => {
	const eModal = document.querySelector('#tpl-modal-delete-sentence').content.firstElementChild.cloneNode(true);
	// modal content
	eModal.querySelector('#modal-abbr-L2').textContent = capitalize(lexicon.L2.abbr || 'L2');
	eModal.querySelector('#modal-abbr-L1').textContent = capitalize(lexicon.L1.abbr || 'L1');
	eModal.querySelector('#modal-sent-L2').textContent = trim(activeEntry.sents[sentId].L2 || '---', MODAL_FOCUS_MAXLEN);
	eModal.querySelector('#modal-sent-L1').textContent = trim(activeEntry.sents[sentId].L1 || '---', MODAL_FOCUS_MAXLEN);
	// modal actions
	eModal.querySelector('#modal-action-delete').onclick = () => {
		console.log(activeEntry.sents[sentId]);
		activeEntry.sents.splice(sentId,1); // delete data
		markModified();
		markUpdated('languageForms','lexiconSentenceL2','lexiconAudio');
		renderAllSentences();
		activeMenu.reset(); // clear pointer to old hiding menu, since it just got deleted from the DOM
		closeModal();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalDeleteNote = (noteId) => {
	const eModal = document.querySelector('#tpl-modal-delete-note').content.firstElementChild.cloneNode(true);
	// modal content
	eModal.querySelector('#modal-note').textContent = `"${trim(activeEntry.notes[noteId].note || '---', MODAL_FOCUS_MAXLEN)}"`;
	// modal actions
	eModal.querySelector('#modal-action-delete').onclick = () => {
		console.log(activeEntry.notes[noteId]);
		activeEntry.notes.splice(noteId,1); // delete data
		markModified();
		markUpdated('lexiconNotes');
		renderAllNotes();
		activeMenu.reset(); // clear pointer to old hiding menu, since it just got deleted from the DOM
		closeModal();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => closeModal();
	activateModal(eModal);
};
const openModalCreateForm = (catg,parent) => {
	const eModal = document.querySelector('#tpl-modal-create-form').content.firstElementChild.cloneNode(true);
	// modal content
	eModal.querySelector('#modal-catg').textContent = project.catgs[catg] || capitalize(catg);
	eModal.querySelector('select').replaceWith( document.querySelector('#tpl-form-select').content.firstElementChild.cloneNode(true) );
	// modal actions
	eModal.querySelector('#modal-action-create').onclick = () => {
		const formName = eModal.querySelector('#modal-form-name').value;
		if (!formName) { console.warn('No form name specified. Nothing to create.'); return; }
		if (!lexicon.L2.forms[catg]) lexicon.L2.forms[catg] = []; // TODO: convert to Array.isArray() check
		if (lexicon.L2.forms[catg].indexOf(formName) !== -1) {
			console.warn('A form with that name already exists. Nothing to create.');
			parent.form = lexicon.L2.forms[catg].indexOf(formName);
		} else {
			lexicon.L2.forms[catg].push(formName);
			console.log(lexicon.L2.forms);
			parent.form = lexicon.L2.forms[catg].length - 1;
			populateProjectCatgs(); // refresh project tab
		}
		markModified();
		markUpdated('languageForms');
		console.log(parent);

		// need to refresh interface, whether we created form or not
		buildFormSelect(catg);
		renderAllWordforms();
		renderAllSentences();
		closeModal();
	};
	eModal.querySelector('#modal-action-cancel').onclick = () => {
		// reset to previously-selected option
		renderAllWordforms();
		renderAllSentences();
		closeModal();
	};
	activateModal(eModal);
};



////////////////////////////////////////////////////////////////////////

//// IPC INCOMING ////

const tryListMedia = async (path) => {
	const t0_listMedia = performance.now();
	// request list of files in %PROJDIR%/assets
	const res = await window.electronAPI.listMedia(path);
	console.log(res);
	if (res.error) { console.error(res.message); return; }
	// index files
	lexicon.indexAvailableMedia(res.media);
	console.log(`Scanned ${res.media.length} files in \\assets folder in ${Math.round(performance.now()-t0_listMedia)} ms.`);
};
const tryLoadEntry = (i,forceLoad) => {
	if (i < 0) {
		// display "no entry loaded"
		tabContent[TAB_LEXICON].querySelector('#entry-editor').innerHTML = '';
		tabContent[TAB_LEXICON].querySelector('#entry-editor').appendChild( document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true) );
		tabContent[TAB_LEXICON].querySelector('#entry-editor .window-status p').textContent = 'Load an entry to get started';
		return;
	}
	if (i >= lexicon.data.length) {
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
	// rebuild contents
	renderEditorHeader();
	renderAllWordforms();
	renderAllSentences();
	renderAllNotes();
	// page events
	tabContent[TAB_LEXICON].querySelector('#entry-add-wordform').onclick = () => addWordform();
	tabContent[TAB_LEXICON].querySelector('#entry-add-sentence').onclick = () => addSentence();
	tabContent[TAB_LEXICON].querySelector('#entry-add-note').onclick = () => addNote();
	tabContent[TAB_LEXICON].querySelector('#entry-delete').onclick = () => openModalDeleteEntry(i);
};



//// RENDERER-TO-MAIN IPC TRIGGERS ////

const setWindowTitle = () => {
	if (!file.isOpen) {
		document.title = `LexPad`;
		return;
	}
	if (file.modified) {
		document.title = `*${file.filename} - LexPad`;
	} else {
		document.title = `${file.filename} - LexPad`;
	}
};

//// file creation

// export text file
const exportTextFile = (contents='') => {
	console.log('Renderer exports text file.');
	console.log(contents);
	if (!contents) console.warn(`Contents of file are blank.`);
	window.electronAPI.rendererExportTextFile( String(contents) );
};

//// project state

// mark modified
window.electronAPI.onMainMarkModified(() => {
	if (!file.isOpen) { console.error('Main requests mark project modified, but no project currently open.'); return; }
	console.log('Main requests mark project modified.');
	markModified(); // renderer has authority over save state
});
const markModified = () => {
	if (!file.isOpen) { console.warn('No project currently open. Nothing to mark as modified.'); return; }
	if (!file.modified) {
		console.log('Renderer marks project as modified.');
		file.modified = true;
		setWindowTitle();
		window.electronAPI.rendererMarkModified();
	}
};
// save project
window.electronAPI.onMainSaveProject(() => {
	console.log('Main requests save project.');
	trySaveProject();
});
const trySaveProject = async () => {
	if (!file.isOpen) { console.error('No project currently open. No changes to save.'); return false; }
	if (!file.modified) { console.warn('No changes to save.'); return false; }
	console.log('Renderer saves project.');
	const res = await window.electronAPI.rendererSaveProject( lexicon.toJSON() );
	console.log(res);
	if (res.error) { console.error(res.message); return false; }
	console.log('Main confirms project is saved.');
	file.modified = false;
	setWindowTitle();
	project.lastEdited = performance.now();
	return true;
};
window.electronAPI.onMainSaveProjectAs(() => {
	console.log('Main requests save project to new file.');
	trySaveProjectAs();
});
const trySaveProjectAs = async () => {
	if (!file.isOpen) { console.error('No project currently open. No changes to save.'); return false; }
	console.log('Renderer saves project to new file.');
	const res = await window.electronAPI.rendererSaveProjectAs( lexicon.toJSON() );
	console.log(res);
	if (res.canceled) return false;
	if (res.error) { console.error(res.message); return false; }
	console.log('Main confirms project is saved.');
	Object.assign(file, {
		isOpen : true,
		path : res.path.replace(/\\[^\\]+?$/,''),
		filename : res.path.replace(/^.+\\/,''),
		modified : false
	});
	setWindowTitle();
	project.lastEdited = performance.now();
	return true;
};
// create new project
const tryBeginCreateProject = () => {
	if (file.isOpen && file.modified) {
		console.log('Unsaved changes detected.');
		openModalUnsavedChanges(choice => {
			switch (choice) {
				case 0: if (trySaveProject()) openModalCreateProject(); break;
				case 1: console.log('Discarding changes'); openModalCreateProject(); break;
				case 2: closeModal(); break;
			}
		});
	} else {
		console.log('No changes to save. Creating new project.');
		openModalCreateProject();
	}
};
window.electronAPI.onMainCreateProject(() => {
	console.log('Main requests create new project.');
	tryBeginCreateProject();
});
const tryCreateProject = async (filepath,filename) => {
	// can't support headless project since projects need to access their settings file and assets folder
	// ask main to create relevant files/directories
	console.log(`Renderer creates project in "${filepath}".`);
	console.log(`Project file will be "${filepath}\\${filename}.json".`);
	console.log(`Media will be stored in "${filepath}\\assets".`);
	const res = await window.electronAPI.rendererCreateProject(filepath,filename);
	console.log(res);
	if (res.error) { console.error(res.message); return; }
	// if success, close modal and open project
	console.log(`Project successfully created. Opening project "${filepath}\\${filename}.json"...`);
	await tryLoadProject(`${filepath}\\${filename}.json`);
	closeModal();
};
// open project (choose project -> load project)
const tryBeginOpenProject = () => {
	if (file.isOpen && file.modified) {
		console.log('Unsaved changes detected.');
		openModalUnsavedChanges(choice => {
			switch (choice) {
				case 0:
					if (trySaveProject()) {
						tryOpenProject();
						closeModal();
					}
					break;
				case 1: console.log('Modal choice: Don\'t save'); tryOpenProject(); closeModal(); break;
				case 2: closeModal(); break;
			}
		});
	} else {
		tryOpenProject();
	}
};
window.electronAPI.onMainOpenProject(() => {
	console.log('Main requests open project.');
	// tryOpenProject();
	tryBeginOpenProject();
});
const tryOpenProject = async () => {
	// if (file.isOpen && file.modified) {
	// 	console.log('Unsaved changes detected.');
	// 	// trigger [Save,Discard,Cancel] modal
	// 		// if save, trySaveProject()
	// 		// if discard, continue
	// 		// if cancel, return
	// 	console.log('DBG FORCE Renderer opens project.');
	// } else {
	// 	console.log('Renderer opens project.');
	// }
	console.log('Renderer open project.');
	const res = await window.electronAPI.rendererOpenProject();
	console.log(res);
	if (res.canceled) return;
	if (res.error) { console.error(res.message); return; }
	// if we got a valid file, trigger loading screen and try to parse it
	if (res.path) {
		// TODO: trigger loading screen
		// TODO: close new project modal
		await tryLoadProject(res.path);
		// TODO: dispose loading screen
	} else {
		console.error(`Open file dialogue did not return a valid filepath.`);
	}
};
const tryLoadProject = async (path) => {
	const t0_loadProject = performance.now();
	console.log(`Renderer loads project "${path}".`);

	// request JSON parse of selected file
	const res = await window.electronAPI.rendererLoadProject(path);
	console.log(res);
	if (res.error) { console.error(res.message); return; }
	// parse JSON file and perform indexing
	if (!lexicon.fromJSON(res.json)) {
		console.error('Renderer failed to load project file. Aborting open project.');
		return;
	}
	// file.isOpen = true;
	// file.path = res.path.replace(/\\[^\\]+?$/,'');
	// file.filename = res.path.replace(/^.+\\/,'');
	// file.modified = false;
	Object.assign(file, {
		isOpen : true,
		path : res.path.replace(/\\[^\\]+?$/,''),
		filename : res.path.replace(/^.+\\/,''),
		modified : false
	});
	console.log(file);
	// reset UI elements in case a previous project was open
	closeModal();
	closeTutorial();
	setWindowTitle();

	// build/render app UI (just quick-copy bar at the moment)
	populateQuickCopyBar();
	document.querySelector('#quick-copy-tooltip').textContent = (ctrlDown === gubbins.quickCopy.state) ? 'Click to insert:' : 'Click to copy:';
	eStatbarLeft.title = `Click to insert in current textbox. Ctrl+Click to copy to clipboard. Hold Shift for uppercase.`; // hover text
	// reset modifier keys; keyboard shortcuts (ie Ctrl+O) cause modifiers to get stuck in down position cuz of open file dialogue stealing focus
	ctrlDown = false;
	shiftDown = false;
	renderModifierKeys();
	// rebuild/render project tab
	populateProjectTab();
	renderTab(TAB_PROJECT); // disposes loading screen

	const t1_loadProject = performance.now();
	console.log(`Project file loaded in ${Math.round(t1_loadProject-t0_loadProject)} ms.`);

	// scan for media in project directory
	console.log(`tryLoadProject() scans for media in ${path}`);
	await tryListMedia(path);
	lexicon.indexMediaUsage();

	const t2_loadProject = performance.now();
	console.log(`Media scanned in ${Math.round(t2_loadProject-t1_loadProject)} ms.`);

	// rebuild lexicon tab
	populateLexicon();
	if (project.activeEntry !== -1) {
		console.log(`Loading entry ${project.activeEntry}`);
		tryLoadEntry(project.activeEntry,true); // not async, but may fail to load
	} else {
		console.log('Project did not specify an entry to load.');
	}

	const t3_loadProject = performance.now();
	console.log(`Lexicon tab built in ${Math.round(t3_loadProject-t2_loadProject)} ms.`);

	// rebuild search tab
	populateSearchTab(); // automatically renders UI

	const t4_loadProject = performance.now();
	console.log(`Search tab built in ${Math.round(t4_loadProject-t3_loadProject)} ms.`);

	// rebuild analysis tab
	populateAnalysisTab();

	const t5_loadProject = performance.now();
	console.log(`Analysis tab built in ${Math.round(t5_loadProject-t4_loadProject)} ms.`);
	
	console.log(`All loading done in ${Math.round(performance.now()-t5_loadProject)} ms.`);
}

//

// media selection
const addAudioTo = async (parent) => {
	// parent should be lexicon obj that accepts audio, such as lexicon.data[i].sents[j] = {L2:'',audio:[]}
	console.log('Renderer selects audio file(s).');
	const res = await window.electronAPI.rendererSelectAudio();
	if (res.canceled || !res.paths || res.paths.length === 0) return false;
	if (!Array.isArray(parent.audio)) parent.audio = [];
	// push selected file(s) to parent.audio[] iff files are in project folder (allows relative paths)
	let hasAddedAudio = false;
	const pathFrag = file.path + '\\';
	const pathTest = new RegExp( RegExp.escape(pathFrag) );
	for (let audio of res.paths) {
		// TODO: make sure audio isn't already in parent.audio
		if (pathTest.test(audio)) {
			console.log(`GOOD "${audio.replace(pathFrag,'')}"`);
			parent.audio.push(audio.replace(pathFrag,''));
			hasAddedAudio = true;
		} else {
			console.warn(`ERR OUTSIDE PROJ "${audio}". Audio not added.`);
		}
	}
	parent.audio.sort();
	if (hasAddedAudio) markModified(); // only mark project modified if at least one file successfully added
	return true;
};
const addImageTo = async (parent) => {
	// parent should be lexicon obj that accepts images, such as lexicon.data[i] = {L1:'',images:[],...}
	console.log('Renderer selects image file(s).');
	const res = await window.electronAPI.rendererSelectImages();
	if (res.canceled || !res.paths || res.paths.length === 0) return false;
	if (!Array.isArray(parent.images)) parent.images = [];
	// push selected file(s) to parent.images[] iff files are in project folder (allows relative paths)
	let hasAddedImage = false;
	const pathFrag = file.path + '\\';
	const pathTest = new RegExp( RegExp.escape(pathFrag) );

	for (let image of res.paths) {
		// TODO: make sure image isn't already in parent.image
		if (pathTest.test(image)) {
			console.log(`GOOD "${image.replace(pathFrag,'')}"`);
			parent.images.push(image.replace(pathFrag,''));
			hasAddedImage = true;
		} else {
			console.warn(`ERR OUTSIDE PROJ "${image}". Image not added.`);
		}
	}
	parent.images.sort();
	if (hasAddedImage) markModified(); // only mark project modified if at least one file successfully added
	return true;
};


// pattern for two-way comms where TX has authority:
	// TX checks prereqs
		// if good, run takeAction() on TX side
		// if bad, throw error and refuse to transmit
	// RX receives signal and checks prereqs
		// if also good, run takeAction() on RX side
		// if bad, give de-sync warning

// pattern for two-way comms where TX/RX both need to approve action:
// TX check();request() -> RX check();execute();approve() -> TX execute()
	// TX checkPrereqs()
		// if good, send requestAction()
		// if bad, throw error
	// RX onRequestAction() -> checkPrereqs()
		// if good, takeAction() and send approveAction()
		// if bad, throw error and send denyAction()
	// TX onApproveAction() -> takeAction()
	// TX onDenyAction() -> throw error





//// MAIN-TO-RENDERER IPC TRIGGERS ////

// //
// window.electronAPI.onTriggerCreateProject(() => {
// 	console.log(`IPC trigger: Create new project. Main has already verified there are no unsaved changes.`);
// });

// attach keyboard shortcuts
window.electronAPI.onTriggerTab(tabId => {
	console.log(`IPC trigger: Render tab ${tabId}.`);
	renderTab(tabId);
});

// tutorials/references
window.electronAPI.onMainOpenKeyboardShortcuts(() => {
	console.log(`IPC trigger: Open keyboard shortcut reference.`);
	openTutorialKeyboardShortcuts();
});





////////////////////////////////

init();

// tryOpenProject();

// openModalCreateProject();



// // set ops
// // a.diff(b) => in a but not in b
// let s1 = new Set([4,5,6]);
// let s2 = new Set([5,6,7]);
// console.log(s1.difference(s2)); // 4
// console.log(s2.difference(s1)); // 7

// lexicon.checkUnderlying(); // 7,99
// lexicon.accessA.x = 88; // mods original obj
// lexicon.checkUnderlying(); // 88,99
// lexicon.replaceA(); // creates new obj
// lexicon.checkUnderlying(); // 1000,99
// lexicon.accessA.x = 88; // no longer works; accessA points to original obj
// lexicon.checkUnderlying(); // 1000,99
// lexicon.rebindAccess(); // need to check whether this GCs old object
// lexicon.accessA.x = 88; // works again
// lexicon.checkUnderlying(); // 88,99

// // test IPC file transfer mutability
// (async () => {
//     // test confirms objects get deep copied when piped from main to renderer
//     // changes here will not mutate data on main
//     let res = await window.electronAPI.requestObject();
//     console.log(res);
//     res.v = 9;
//     console.log(res);
//     window.electronAPI.checkObject();
// })();