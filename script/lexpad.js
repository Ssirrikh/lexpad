
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

const DBG_TAG_STATES = ['EXCL','NOREQ','INCL'];
const TAG_F = 0; // tag false (exclude)
const TAG_N = 1; // tag null (no constraint)
const TAG_T = 2; // tag true (include)

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
			if (hasImage) e.querySelector('.search-result-header .icon:nth-child(1)').classList.add('icon-audio');
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
	},
	// submitSearch : (frag) => {
	// 	const t0_advancedSearch = performance.now();

	// 	const reFrag = new RegExp( RegExp.escape(frag) );
	// 	console.log(reFrag);
	// 	// all tags of same type false => none specified => search in all
	// 	// const inAny = !searchSettings.include.in.L1 && !searchSettings.include.in.L2 && !searchSettings.include.in.sentL1 && !searchSettings.include.in.sentL2 && !searchSettings.include.in.note;
	// 	const inAny = Object.values(searchSettings.include.in).every(x => !x);
	// 	const catgAny = Object.values(searchSettings.include.catg).every(x => !x);
	// 	const hasAny = Object.values(searchSettings.include.has).every(x => !x);
	// 	// use ||= short circuiting for efficient checking
	// 	for (let entry of lexicon.data) {
	// 		// IN [L1,L2,sentL1,sentL2,note]
	// 		let matchIn = false;
	// 		// matchIn ||= (inAny || searchSettings.include.in.L1) && reFrag.test(entry.L1); // exposes "x; y" if desired; future gubbins toggle
	// 		matchIn ||= (inAny || searchSettings.include.in.L1) && entry.L1.split(RE_SYNONYM_SPLITTER).some(w => reFrag.test(w));
	// 		matchIn ||= (inAny || searchSettings.include.in.L2) && entry.L2.some(form => reFrag.test(form.L2)); // need to integrate "x; y" gubbins toggle here too
	// 		matchIn ||= (inAny || searchSettings.include.in.sentL1) && entry.sents.some(sent => reFrag.test(sent.L1));
	// 		matchIn ||= (inAny || searchSettings.include.in.sentL2) && entry.sents.some(sent => reFrag.test(sent.L2));
	// 		matchIn ||= (inAny || searchSettings.include.in.note) && entry.notes.some(note => reFrag.test(note.note));
	// 		// console.log(`"${reFrag}" in L1 "${entry.L1}" : ${reFrag.test(entry.L1)},${entry.L1.split(RE_SYNONYM_SPLITTER).some(w => reFrag.test(w))}`);
	// 		// for (let form of entry.L2) console.log(`"${reFrag}" in L2 "${form.L2}" : ${reFrag.test(form.L2)},${form.L2.split(RE_SYNONYM_SPLITTER).some(w => reFrag.test(w))}`);
	// 		// for (let sent of entry.sents) console.log(`"${reFrag}" in sentence L1,L2: ${reFrag.test(sent.L1)},${reFrag.test(sent.L2)}`);
	// 		// for (let note of entry.notes) console.log(`"${reFrag}" in note: ${reFrag.test(note.note)}`);

	// 		// CATG [...,misc]
	// 		let matchCatg = false;
	// 		matchCatg ||= (catgAny || searchSettings.include.catg[entry.catg]);
	// 		// console.log(`all? ${catgAny}, match? ${catgAny || searchSettings.include.catg[entry.catg]}`);

	// 		// HAS [L1,L2,sentence,note,audio,image]
	// 		let notHas = false; // can't use ||= short circuit w/ true->false accumulator, so use false->true accumulator and invert later
	// 		notHas ||= searchSettings.include.has.L1 && !entry.L1;
	// 		notHas ||= searchSettings.include.has.L2 && !(entry.L2?.length > 0);
	// 		notHas ||= searchSettings.include.has.sentence && !(entry.sents?.length > 0);
	// 		notHas ||= searchSettings.include.has.note && !(entry.notes?.length > 0);
	// 		notHas ||= searchSettings.include.has.audio && !(
	// 			entry.L2?.some(form => form.audio?.length > 0) || entry.sents?.some(sentence => sentence.audio?.length > 0) // (should have audio) AND NOT(either has audio)
	// 		);
	// 		notHas ||= searchSettings.include.has.image && !(entry.images?.length > 0);
	// 		let matchHas = !notHas;
	// 		// console.log(`has:L1 ${!!entry.L1}`);
	// 		// console.log(`has:L2 ${entry.L2?.length>0}`);
	// 		// console.log(`has:sentence ${entry.sents?.length>0}`);
	// 		// console.log(`has:note ${entry.notes?.length>0}`);
	// 		// console.log(`has:audio(form) ${entry.L2?.some(form => form.audio?.length>0)}`);
	// 		// console.log(`has:audio(sentence) ${entry.sents?.some(sentence => sentence.audio?.length>0)}`);
	// 		// console.log(`has:image ${entry.images?.length>0}`);
	// 		// console.log(`match has? ${matchHas}`);

	// 		console.log((matchIn && matchCatg && matchHas) ? 'MATCH' : 'NO MATCH');
	// 	}

	// 	console.log(`Advanced search done in ${Math.round(performance.now()-t0_advancedSearch)} ms.`);
	// 	// if all of search.in are false, set inAny = true (not searching specific fields)
	// 	// for entry in lexicon, include if:
	// 		// (inAny) || (search.in[L1] && entry.L1.contains(searchFrag)) || ...
	// 		// AND entry.catg != 'misc' && search.catg[entry.catg] == true
	// 		// AND (search.has[audio] && entry.containsAudio()) && ...
	// }
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
	// nWelcomePage.querySelector('#btn-create-project').onclick = async () => markModified();
	// allow page to render, then build content skeletons off-DOM
	renderWelcomePage();
	requestAnimationFrame(() => {
		const t0_init_deferred = performance.now();
		// project tab
		tabContent[TAB_PROJECT] = document.getElementById('tpl-project-page').content.firstElementChild.cloneNode(true);
		tabContent[TAB_PROJECT].querySelector('#lang-name').onfocus = () => activeInput = tabContent[TAB_PROJECT].querySelector('#lang-name');
		tabContent[TAB_PROJECT].querySelector('#lang-abbr').onfocus = () => activeInput = tabContent[TAB_PROJECT].querySelector('#lang-abbr');
		tabContent[TAB_PROJECT].querySelector('#lang-alph').onfocus = () => activeInput = tabContent[TAB_PROJECT].querySelector('#lang-alph');
		tabContent[TAB_PROJECT].querySelector('#dbg-mark-modified').onclick = () => markModified();
		// lexicon tab
		tabContent[TAB_LEXICON] = document.getElementById('tpl-lexicon-page').content.firstElementChild.cloneNode(true);
		tabContent[TAB_LEXICON].style.padding = '0';
		tabContent[TAB_LEXICON].querySelector('#lexicon-search').onfocus = () => activeInput = tabContent[TAB_LEXICON].querySelector('#lexicon-search');
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
		tabContent[TAB_LEXICON].querySelector('#lexicon-search-clear').onclick = () => clearLexiconSearch();
		tabContent[TAB_LEXICON].querySelector('#entry-editor').innerHTML = '';
		tabContent[TAB_LEXICON].querySelector('#entry-editor').appendChild( document.getElementById('tpl-bg-status').content.firstElementChild.cloneNode(true) );
		tabContent[TAB_LEXICON].querySelector('#entry-editor .window-status p').textContent = 'Load an entry to get started';
		// search tab
		tabContent[TAB_SEARCH] = document.getElementById('tpl-search-page').content.firstElementChild.cloneNode(true);
		tabContent[TAB_SEARCH].style.padding = '0';
		tabContent[TAB_SEARCH].querySelector('#search-query').onfocus = () => activeInput = tabContent[TAB_SEARCH].querySelector('#search-query');
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
	// focus management
	switch (tabId) {
		case TAB_PROJECT: tabContent[TAB_PROJECT].querySelector('#lang-name').focus(); break;
		case TAB_LEXICON: tabContent[TAB_LEXICON].querySelector('#lexicon-search').focus(); break;
		case TAB_SEARCH: tabContent[TAB_SEARCH].querySelector('#search-query').focus(); break;
		default: activeInput = null; console.warn(`Tab id ${tabId} does not have a designated focus target. Clearing focus anchor.`);
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
	for (let i = 0; i < alphabet.length; i++) {
		const letter = alphabet[i];
		if (englishAlphabet.indexOf(letter) !== -1) continue;
		eStatbarLeft.appendChild( Object.assign(document.createElement('button'), {
			id : `quick-copy-${i}`,
			className : 'quick-copy-letter',
			textContent : letter,
			onclick : () => copyOrInsert(letter)
		}) );
	}
};
const updateQuickCopyBar = () => {
	// if (!file.isOpen) return;
	let alphabet = lexicon.L2.alph.split(' ');
	for (let i = 0; i < alphabet.length; i++) {
		const e = document.querySelector(`#quick-copy-${i}`);
		if (e) e.textContent = (shiftDown) ? capitalize(alphabet[i]) : alphabet[i];
	}
};
const populateProjectTab = () => {
	// language data
	// TODO: onblur events mark project modified if change detected
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
	const stats = lexicon.calculateStatistics(); // guaranteed complete, doesn't req checks for props
	console.log(stats);
	tabContent[TAB_PROJECT].querySelector('#project-stats-num-entries > span').textContent = stats.numEntries ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L1 > span').textContent = stats.wordCounts?.L1 ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L1').onclick = () => searchTag('has:L1');
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L2 > span').textContent = stats.wordCounts?.L2 ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-wordcount-L2').onclick = () => searchTag('has:L2');
	tabContent[TAB_PROJECT].querySelector('#project-stats-sentence-count > span').textContent = stats.numSentences ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-sentence-count').onclick = () => searchTag('has:sentence');
	tabContent[TAB_PROJECT].querySelector('#project-stats-notes-count > span').textContent = stats.numNotes ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-notes-count').onclick = () => searchTag('has:note');
	tabContent[TAB_PROJECT].querySelector('#project-stats-audio-count > span').textContent = stats.mediaCounts.audioEntries ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-audio-count').onclick = () => searchTag('has:audio');
	tabContent[TAB_PROJECT].querySelector('#project-stats-image-count > span').textContent = stats.mediaCounts.imageEntries ?? '??';
	tabContent[TAB_PROJECT].querySelector('#project-stats-image-count').onclick = () => searchTag('has:image');
	const eStatsCatgs = tabContent[TAB_PROJECT].querySelector('#project-stats-catgs');
	eStatsCatgs.innerHTML = '';
	for (let catg in stats.catgCounts) {
		let e = document.getElementById('tpl-catg-bubble').content.firstElementChild.cloneNode(true);
			e.title = `catg:${catg}`;
			e.onclick = () => searchTag(`catg:${catg}`);
			e.querySelector('.catg-bubble-label').textContent = project.catgs[catg] ?? catg;
			e.querySelector('.catg-bubble-count').textContent = stats.catgCounts[catg];
		eStatsCatgs.appendChild(e);
	}
	let e = document.getElementById('tpl-catg-bubble').content.firstElementChild.cloneNode(true);
		e.title = `catg:misc`;	
		e.onclick = () => searchTag(`catg:misc`);
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
		if (lexicon.orderedL1[i].hasImage) e.querySelector('.flex-row .icon:nth-child(1)').classList.add('icon-audio');
		if (lexicon.orderedL1[i].hasAudio) e.querySelector('.flex-row .icon:nth-child(2)').classList.add('icon-audio');
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
		onfocus : () => activeInput = tabContent[TAB_LEXICON].querySelector('#entry-L1'),
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
		onfocus : () => activeInput = tabContent[TAB_LEXICON].querySelector(`#entry-form-${i}-content`),
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
	// sentences
	Object.assign(e.querySelector('.entry-sentence-L1'), {
		id : `entry-sentence-${i}-L1`,
		value : activeEntry.sents[i].L1,
		onfocus : () => activeInput = tabContent[TAB_LEXICON].querySelector(`#entry-sentence-${i}-L1`),
		onblur : () => {
			activeEntry.sents[i].L1 = document.getElementById(`entry-sentence-${i}-L1`).value;
			console.log(activeEntry.sents[i]);
		}
	});
	Object.assign(e.querySelector('.entry-sentence-L2'), {
		id : `entry-sentence-${i}-L2`,
		value : activeEntry.sents[i].L2,
		onfocus : () => activeInput = tabContent[TAB_LEXICON].querySelector(`#entry-sentence-${i}-L2`),
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
		onfocus : () => activeInput = tabContent[TAB_LEXICON].querySelector(`#entry-note-${i}`),
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
	tabContent[TAB_LEXICON].querySelector(`#entry-form-${activeEntry.L2.length - 1}-content`).focus();
	tabContent[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
};
const addSentence = () => {
	activeEntry.sents.push({ formId : -1, L1 : "", L2 : "" });
	if (activeEntry.sents.length === 1) {
		tabContent[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
	}
	renderSentence(activeEntry.sents.length - 1);
	tabContent[TAB_LEXICON].querySelector(`#entry-sentence-${activeEntry.sents.length - 1}-L2`).focus();
	tabContent[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sents.length})`;
};
const addNote = () => {
	activeEntry.notes.push({ formId : -1, note : "" });
	if (activeEntry.notes.length === 1) {
		tabContent[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
	}
	renderNote(activeEntry.notes.length - 1);
	tabContent[TAB_LEXICON].querySelector(`#entry-note-${activeEntry.notes.length - 1}`).focus();
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



////////////////////////////////////////////////////////////////////////

//// IPC INCOMING ////





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



//// RENDERER-TO-MAIN IPC TRIGGERS ////

// project state

// mark modified
window.electronAPI.onMainMarkModified(() => {
	if (!file.isOpen) { console.error('Main tries to mark project modified, but no project currently open.'); return; }
	file.modified = true;
	console.log('Main marks project as modified.');
});
const markModified = () => {
	if (!file.isOpen) { console.warn('No project currently open. Nothing to mark as modified.'); return; }
	if (!file.modified) {
		console.log('Renderer marks project as modified.');
		file.modified = true;
		window.electronAPI.rendererMarkModified();
	}
};
// save project
window.electronAPI.onMainSaveProject(() => {
	console.log('Main requests save project.');
	trySaveProject();
});
const trySaveProject = async () => {
	if (!file.isOpen) { console.error('No project currently open. No changes to save.'); return; }
	if (!file.modified) { console.warn('No changes to save.'); return; }
	console.log('Renderer saves project STUB.');
	const stubObject = {
		x : 7,
		y : 9
	};
	const res = await window.electronAPI.rendererSaveProject( JSON.stringify(stubObject) );
	console.log(res);
	if (res.error) { console.error(res.message); return; }
	console.log('Main confirms project is saved.');
	file.modified = false;
};
// open project (choose project -> load project)
window.electronAPI.onMainOpenProject(() => {
	console.log('Main requests open project.');
	tryOpenProject();
});
const tryOpenProject = async () => {
	if (file.isOpen && file.modified) {
		console.log('Unsaved changes detected.');
		// trigger [Save,Discard,Cancel] modal
			// if save, trySaveProject()
			// if discard, continue
			// if cancel, return
		console.log('DBG FORCE Renderer opens project.');
	} else {
		console.log('Renderer opens project.');
	}
	const res = await window.electronAPI.rendererOpenProject();
	console.log(res);
	if (res.canceled) return;
	if (res.error) { console.error(res.message); return; }
	// if we got a valid file, trigger loading screen and try to parse it
	if (res.path) {
		// TODO: trigger loading screen
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
	file.isOpen = true;
	file.path = res.path.replace(/\\[^\\]+?$/,'');
	file.filename = res.path.replace(/^.+\\/,'');
	file.modified = false;
	console.log(file);

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
	await tryListMedia(path);

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

	console.log(`Search tab built in ${Math.round(performance.now()-t3_loadProject)} ms.`);
	console.log(`All loading finished in ${Math.round(performance.now()-t0_loadProject)} ms.`);
}


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

//
window.electronAPI.onTriggerCreateProject(() => {
	console.log(`IPC trigger: Create new project. Main has already verified there are no unsaved changes.`);
});

// attach keyboard shortcuts
window.electronAPI.onTriggerTab(tabId => {
	console.log(`IPC trigger: Render tab ${tabId}.`);
	renderTab(tabId);
});





////////////////////////////////

init();

// tryOpenProject();








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