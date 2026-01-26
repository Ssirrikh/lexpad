
const VERSION = "v0.0";

const RE_SYNONYM_SPLITTER = /;\s*/;

const SYNONYM_SPLITTER = '; ';
const ALPHABET_SPLITTER = ' ';

//// global helpers ////

const RE_ESCAPE = /[&<>"']/g;
const RE_MAP_ESCAPE = { "&" : "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }; // all contexts support &#39; but not all support &apos;, so ignore it
// function escapeHTML (s) {
// 	return String(s).replace(RE_ESCAPE, c => RE_MAP_ESCAPE[c]);
// }
const escapeHTML = (s) => String(s).replace(RE_ESCAPE, c => RE_MAP_ESCAPE[c]);

const alphabetizeIndex = (a,b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase());

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



//// DEFAULTS / PRESETS ////

const L1 = Object.freeze({
	"name" : "English",
	"abbr" : "eng",
	"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
	"usesForms" : false
});

// const TPL_NEW_PROJECT = `{
// 	"_WARNING" : "Save a backup of this project before mucking around in here! It will be annoying for everyone involved if you break something and have to call IT about it because you didn't save a backup.",
// 	"project" : {
// 		"lexpadVersion" : "${VERSION}",
// 		"activeEntry" : -1,
// 		"catgs" : {}
// 	},
// 	"language" : {
// 		"name" : "",
// 		"abbr" : "",
// 		"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
// 		"usesForms" : true,
// 		"forms" : {}
// 	},
// 	"lexicon" : []
// }`;



//// PROGRAM STATE ////

// program state; should always mirror copy in main process
let file = {
	isOpen : false,
	path : ``,
	filename : ``,
	modified : false
};

// file access
let fileContents = { // gets replaced by JSON.parse(rawFile)
	project : {},
	language : {},
	lexicon : []
};
let project, L2, data; // named access points for module export
const rebindAccess = () => {
	// access points must be rebound whenever file is loaded, so they point to new file
	project = fileContents.project;
	L2 = fileContents.language;
	data = fileContents.lexicon;
	// TODO: use memory snapshot to make sure old file successfully GC'd
};

// indexing
let orderedL1 = []; // sorted list of {word,catg,entryId,hasAudio,hasImage} (sorted alphabetically by obj.word)
let orderedL2 = []; // sorted list of {word,catg,entryId,hasAudio,hasImage} (sorted alphabetically by obj.word)
let media = {}; // hash table of referenced media s.t. media[fileName] = [...array of entryId that reference filename]

let indexing = {
	// indexed data

	orderedL1 : [], // array of {wordL1,catg,entryId,hasAudio,hasImage} sorted alphabetically by obj.word
	orderedL2 : [], // array of {wordL2,catg,entryId,hasAudio,hasImage} sorted alphabetically by obj.word
	mediaAvailable : [], // array of media found in the project's /assets folder (requested from main)
	mediaReferenced : {}, // hash table media[fileName] = [...array of entryId that reference filename]
	catgs : {
		numCatgs : 0, // total number of defined catgs in project
		numFormsTotal : 0, // sum total number of forms across all catgs
		ordered : [], // alphabetized list of catgs
		numEntries : {}, // hash table catgs.numEntries[catg] = number of entries of that catg
		numForms : {}, // hash table catgs.numForms[catg] = number of defined forms for that catg
	},

	// direct indexing
	indexOrderedCatgs : () => {
		indexing.catgs.numCatgs = 0;
		indexing.catgs.numForms = {};
		indexing.catgs.numFormsTotal = 0;
		for (let catg in project.catgs) {
			indexing.catgs.numCatgs++;
			indexing.catgs.numForms[catg] = 0;
			for (let form of project.catgs[catg]) {
				if (form || form === '') {
					indexing.catgs.numForms[catg]++;
					indexing.catgs.numFormsTotal++;
				}
			}
		}
	},

	// updates

	// catg manipulation
	onCreateCatg : (catg) => {
		// recount catgs
	},
	onEditCatg : (oldCatg,newCatg) => {
		// if (newCatg !== oldCatg)
			// loop through orderedL1 and replace
			// loop through orderedL2 and replace
			// recount catgs
	},
	onDeleteCatg : (catg) => {
		// loop through orderedL1 and unset
		// loop through orderedL2 and unset
		// recount catgs
	},
	// entry manipulation
	onCreateEntry : (entryId,catg) => {
		// orderedL1.push({ word:'', catg:catg, entryId:entryId, hasAudio:false, hasImage:false } );
		// orderedL2.push({ word:'', catg:catg, entryId:entryId, hasAudio:false, hasImage:false } );
		// if (!catgCounts[catg]) catgCounts[catg] = 0;
		// catgCounts[catg]++;
	},
	onDeleteEntry : (entryId) => {
		// for (indexCard of orderedL1)
			// if (indexCard.entryId === entryId) delete indexCard
		// for (indexCard of orderedL2)
			// if (indexCard.entryId === entryId) delete indexCard
		// for (wordform,sentence  in entry)
			// for (audio in wordform,sentence)
				// remove entryId from mediaReferenced[audio]
		// catgCounts[entry.catg]--;
	},
};
const indexWords = () => {
	orderedL1 = []; // TODO: check if anything more than this is req'd to GC previously-open project
	orderedL2 = [];
	for (let i = 0; i < data.length; i++) {
		// console.log(data[i]);
		const hasImage = data[i].images?.length > 0;
		const hasAudio = data[i].L2?.some(form => form.audio?.length > 0) || data[i].sents?.some(sentence => sentence.audio?.length > 0);
		orderedL1.push(...data[i].L1.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[i].catg,entryId:i,hasAudio:hasAudio,hasImage:hasImage}}));
		for (let form of data[i].L2) orderedL2.push(...form.L2.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[i].catg,entryId:i,hasAudio:hasAudio,hasImage:hasImage}}));
	}
	orderedL1.sort(alphabetizeIndex);
	orderedL2.sort(alphabetizeIndex);
};


//// FILE MANAGEMENT ////

const createProject = () => {
	console.log(`dictionary.js instantiates new project from template.`);
	// fromJSON(TPL_NEW_PROJECT);
};

const createCatg = (catgName,catgAbbr) => {
	if (!catgName || !catgAbbr) { console.error(`Cannot create catg "${catgName}" (${catgAbbr}). Name or abbreviation were missing.`); return false; }
	catgAbbr = catgAbbr.toLowerCase();
	if (project.catgs[catgAbbr]) { console.error(`Catg with abbreviation "${catgAbbr}" already exists. Abbreviations must be unique.`); return false; }
	// record in project.catgs (catg name/abbr)
	project.catgs[catgAbbr] = catgName;
	console.log(project);
	// record in lexicon.L2.forms (catg forms)
	L2.forms[catgAbbr] = [];
	console.log(L2);
	return true;
};
const editCatg = (prevAbbr,catgName,catgAbbr) => {
	if (!prevAbbr) { console.error(`"${prevAbbr}" is invalid catg abbreviation.`); return false; }
	if (!catgName || !catgAbbr) { console.error(`Cannot edit catg "${project.catgs[prevAbbr]}" (${prevAbbr}) to values "${catgName}" (${catgAbbr}). New name or abbreviation were missing.`); return false; }
	if (catgAbbr === prevAbbr && catgName === project.catgs[prevAbbr]) { console.warn(`No changes made to catg name or abbreviation.`); return true; }
	if (catgAbbr !== prevAbbr && Object.keys(project.catgs).indexOf(catgAbbr) !== -1) { console.error(`Another catg with abbreviation "${catgAbbr}" exists. Abbreviations must be unique.`); return false; }

	// edit is valid, so update catgs
	if (catgAbbr !== prevAbbr) delete project.catgs[prevAbbr];
	project.catgs[catgAbbr] = catgName;
	console.log(project);
	if (catgAbbr === prevAbbr) {
		console.log(`Abbr did not change. Exiting early, no further changes necessary.`);
		return true;
	}

	console.log(`Catg abbr changed from "${prevAbbr}" to "${catgAbbr}". Updating forms and entries.`);
	// if abbr changed, update forms
	L2.forms[catgAbbr] = L2.forms[prevAbbr].map(x => x); // deep copy forms
	delete L2.forms[prevAbbr];
	console.log(L2);
	// if abbr changed, update all lexicon entries
	let numEntriesUpdated = 0;
	for (let entry of data) {
		if (entry.catg === prevAbbr) {
			entry.catg = catgAbbr;
			numEntriesUpdated++;
		}
	}
	console.log(`${numEntriesUpdated} entries of catg "${prevAbbr}" have been updated to "${catgAbbr}".`);
	return true;

	// TODO: unit test all three catg funcs
};
const deleteCatg = (catgAbbr,entriesKeepFormNum) => {
	if (!catgAbbr) { console.error(`Cannot delete catg "${catgAbbr}". No such catg exists.`); return false; }
	// delete catg name
	delete project.catgs[catgAbbr]; // TODO: is there any way these delete ops can fail?
	// delete catg form
	delete L2.forms[catgAbbr];
	// unset catg of entries
	let numEntriesUpdated = 0;
	for (let entry of data) {
		if (entry.catg === catgAbbr) {
			entry.catg = '';
			if (!entriesKeepFormNum) {
				for (let form of entry.L2) form.form = -1;
				for (let sent of entry.sents) sent.form = -1;
				for (let note of entry.notes) note.form = -1;
			}
			numEntriesUpdated++;
		}
	}
	console.log(`${numEntriesUpdated} entries of catg "${catgAbbr}" have been unset.`);
	return true;
};

// catg unit tests
	// create
		// missing/invalid input => error
		// valid input, abbr already exists => error
		// valid input, abbr doesn't exist => create it
	// edit
		// missing/invalid input => error
		// valid input, no changes => exit early
		// valid input, catg already exists => error
		// valid input, only name changed => minor update
		// valid input, abbr changed (name may or may not change) => major update
	// delete
		// missing/invalid input => error
		// valid input, keepFormNum => delete catg, unset entries
		// valid input, !keepFormNum => delete catg, unset entries, unset entry forms/sentences/notes

const createForm = (catg,formName='') => {
	if (!catg) { console.error(`Cannot edit form ${formNum} of catg "${catg}". No such catg exists.`); return -1; }
	L2.forms[catg].push(formName);
	return L2.forms[catg].length - 1;
};
const editForm = (catg,formNum,formName) => {
	if (!catg) { console.error(`Cannot edit form ${formNum} of catg "${catg}". No such catg exists.`); return false; }
	if (isNaN(formNum) || formNum < 0) { console.error(`Cannot edit form ${formNum} of catg "${catg}". Form number out of bounds.`); return false; }
	L2.forms[catg][formNum] = String(formName); // cast to string
	return true;
};
const deleteForm = (catg,formNum) => {
	if (!catg) { console.error(`Cannot delete form ${formNum} of catg "${catg}". No such catg exists.`); return false; }
	if (L2.forms[catg][formNum] === undefined) { console.error(`Form ${formNum} of catg "${catg}" does not exist. Nothing to delete.`); return false; }
	// delete form
	L2.forms[catg][formNum] = undefined;
	// unset form assignments
	let numEntriesUpdated = 0;
	for (let entry of data) {
		if (entry.catg === catg) {
			let didEntryUpdate = false;
			for (let form of entry.L2) {
				if (form.form === formNum) {
					form.form = -1;
					didEntryUpdate = true;
				}
			}
			for (let sent of entry.sents) {
				console.log(`formnum is ${formNum}, sent has form ${sent.form}, equal? ${sent.form == formNum}`); // TODO: setting sentence form from dropdown wrongly stores it as string, not number
				console.log(`typof formnum ${typeof formNum}, typeof sent form ${typeof sent.form}`);
				if (sent.form === formNum) {
					sent.form = -1;
					didEntryUpdate = true;
					console.log('sent form unset');
				}
			}
			for (let note of entry.notes) {
				if (note.form === formNum) {
					note.form = -1;
					didEntryUpdate = true;
				}
			}
			if (didEntryUpdate) numEntriesUpdated++;
		}
	}
	console.log(`${numEntriesUpdated} entries of catg "${catg}" have been unset.`);
	return true;
};

const createEntry = (catg) => {
	data.push({
		"L1" : "",
		"catg" : catg,
		"L2" : [],
		"sents" : [],
		"notes" : [],
		"images" : [],
		// "meta" : {}
	});
	orderedL1.push({ word:'', catg:catg, entryId:data.length-1, hasAudio:false, hasImage:false } );
	orderedL2.push({ word:'', catg:catg, entryId:data.length-1, hasAudio:false, hasImage:false } );
	return data.length - 1;
};
const deleteEntry = (entryId) => {
	for (let i = 0; i < orderedL1.length; i++) {
		console.log(`${i}, ${orderedL1[i].entryId} vs ${entryId}`);
		if (orderedL1[i].entryId === entryId) {
			orderedL1.splice(i,1); // if index card belongs to target entry, delete it
			i--;
		}
	}
	for (let i = 0; i < orderedL2.length; i++) {
		console.log(`${i}, ${orderedL2[i].entryId} vs ${entryId}`);
		if (orderedL2[i].entryId === entryId) {
			orderedL2.splice(i,1); // if index card belongs to target entry, delete it
			i--;
		}
	}
};

// deep copy and index json w/o storing refs, so it can be GC'd
const fromJSON = (jsonRaw) => {
	// raw filestring will be GC'd after function completion

	// store json parse in temp var, so currently-open project can remain open in case of parsing error
	let jsonParse = tryParseJSON(jsonRaw);
	console.log(jsonParse);
	if (!jsonParse) return false; // report failure
	// check validity of project file
	if (
		typeof jsonParse.project !== 'object' || typeof jsonParse.project.lexpadVersion !== 'string'
		|| typeof jsonParse.language !== 'object'
		|| !Array.isArray(jsonParse.lexicon)
	) {
		console.error(`JSON did not contain valid LexPad project. Unable to load.`);
		return false;
	}
	console.log(`Project file parsed. Last saved with LexPad ${jsonParse.project.lexpadVersion}.`);
	
	// replace prev project with newly-opened project
	fileContents = jsonParse;
	rebindAccess();

	// TODO: patch missing pieces of project file; update version if necessary
	// TODO: clean unsafe arbitrary text fields
	// TODO: load active entry, if any

	// index data
	indexWords();
	// orderedL1 = []; // TODO: check if anything more than this is req'd to GC previously-open project
	// orderedL2 = [];
	// for (let i = 0; i < data.length; i++) {
	// 	// console.log(data[i]);
	// 	const hasImage = data[i].images?.length > 0;
	// 	const hasAudio = data[i].L2?.some(form => form.audio?.length > 0) || data[i].sents?.some(sentence => sentence.audio?.length > 0);
	// 	orderedL1.push(...data[i].L1.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[i].catg,entryId:i,hasAudio:hasAudio,hasImage:hasImage}}));
	// 	for (let form of data[i].L2) orderedL2.push(...form.L2.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[i].catg,entryId:i,hasAudio:hasAudio,hasImage:hasImage}}));
	// }
	// orderedL1.sort(alphabetizeIndex);
	// orderedL2.sort(alphabetizeIndex);

	// index media
	media = {};
	for (let i = 0; i < data.length; i++) {
		if (data[i].L2) {
			for (let form of data[i].L2) {
				if (!form.audio) continue;
				for (let audio of form.audio) {
					if (!media[audio]) media[audio] = new Set();
					media[audio].add(i);
				}
			}
		}
		if (data[i].sents) {
			for (let sentence of data[i].sents) {
				if (!sentence.audio) continue;
				for (let audio of sentence.audio) {
					if (!media[audio]) media[audio] = new Set();
					media[audio].add(i);
				}
			}
		}
		if (data[i].images) {
			for (let image of data[i].images) {
				if (!media[image]) media[image] = new Set();
				media[image].add(i);
			}
		}
	}
	console.log(`Indexed ${Object.keys(media).length} media files.`);
	console.log(media);

	return true; // report success
};

const calculateStatistics = () => {
	const t0_stats = performance.now();
	let stats = {
		numEntries : 0,
		catgCounts : {}, // prepped below
		catgMiscCount : 0,
		wordCounts : { L1 : 0, L2 : 0 },
		mediaCounts : { audioEntries : 0, audioTotal : 0, imageEntries : 0, imageTotal : 0 },
		numSentences : 0,
		numNotes : 0
	};
	// prep catg counts based on registered catgs
	// blanks and unregistered catgs will be treated as misc
		// unregistered catgs shouldn't be possible unless JSON directly edited outside LexPad
	for (let catg in project.catgs) {
		stats.catgCounts[catg] = 0;
	}
	// number of entries
	stats.numEntries = data.length ?? 0;
	for (let entry of data) {
		// catgs
		if (stats.catgCounts[entry.catg] !== undefined) {
			stats.catgCounts[entry.catg]++;
		} else {
			stats.catgMiscCount++;
		}
		// wordcount
		if (entry.L1) {
			stats.wordCounts.L1 += entry.L1.split(RE_SYNONYM_SPLITTER).length;
		}
		if (entry.L2) {
			for (let form of entry.L2) {
				if (form.L2) stats.wordCounts.L2++;
			}
		}
		// sentences and notes
		if (entry.sents) {
			for (let sentence of entry.sents) {
				if (sentence.L1 || sentence.L2) stats.numSentences++;
			}
		}
		if (entry.notes) {
			for (let note of entry.notes) {
				if (note.note) stats.numNotes++;
			}
		}
		// media
		if (entry.images?.length > 0) {
			let hasImages = false;
			for (let image of entry.images) {
				if (image) {
					hasImages = true;
					stats.mediaCounts.imageTotal++;
				}
			}
			if (hasImages) stats.mediaCounts.imageEntries++;
		}
		let hasAudio = false;
		if (entry.L2?.length > 0) {
			for (let form of entry.L2) {
				if (form.audio?.length > 0) {
					for (let audio of form.audio) {
						if (audio) {
							// if entry.L2 && entry.L2[i] && entry.L2[i].audio && entry.L2[i].audio[j], then increment stats
							hasAudio = true;
							stats.mediaCounts.audioTotal++;
						}
					}
				}
			}
		}
		if (entry.sents?.length > 0) {
			for (let sentence of entry.sents) {
				if (sentence.audio?.length > 0) {
					for (let audio of sentence.audio) {
						if (audio) {
							// if entry.sents && entry.sents[i] && entry.sents[i].audio && entry.sents[i].audio[j], then increment stats
							hasAudio = true;
							stats.mediaCounts.audioTotal++;
						}
					}
				}
			}
		}
		if (hasAudio) stats.mediaCounts.audioEntries++;
	}
	// efficient + safe == ugly :P
	console.log(`Project statistics compiled in ${Math.round(performance.now()-t0_stats)} ms.`);
	return stats;
};



// // exporting an object allows direct modification of it
// let myObj = {
// 	a : {
// 		x : 7,
// 		y : 8
// 	},
// 	b : {
// 		z : 'hello'
// 	}
// };
// const checkObj = () => console.log(`OBJ a.x ${myObj.a.x}, a.y ${myObj.a.y}, b.z ${myObj.b.z}`);
// const replaceObj = () => myObj.a = {x:111};

// let underlyingData = {
// 	a : { x:7 },
// 	b : { y:99 }
// };
// let accessA = underlyingData.a;
// let accessB = underlyingData.b;
// const checkUnderlying = () => console.log(`OBJ a.x ${underlyingData.a.x}, b.y ${underlyingData.b.y}`);
// const replaceA = () => underlyingData.a = { x:1000 };
// const rebindAccess = () => {
// 	accessA = underlyingData.a;
// 	accessB = underlyingData.b;
// };



//// API ////

// directly exporting object allows both modification and replacement w/o breaking link
export {
	// underlyingData, accessA, accessB, checkUnderlying, replaceA, rebindAccess,
	// myObj, checkObj, replaceObj,
	file, project,
	indexWords,
	createCatg, editCatg, deleteCatg,
	createForm, editForm, deleteForm,
	createEntry, deleteEntry,
	fromJSON, calculateStatistics,
	L1, L2, data, orderedL1, orderedL2, media
};