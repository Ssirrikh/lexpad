
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

const TPL_NEW_PROJECT = `{
	"project" : {
		"lexpadVersion" : "${VERSION}",
		"activeEntry" : -1,
		"catgs" : {}
	},
	"language" : {},
	"lexicon" : []
}`;



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



//// FILE MANAGEMENT ////

const createProject = () => {
	console.log(`dictionary.js instantiates new project from template.`);
	// fromJSON(TPL_NEW_PROJECT);
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
	file, project, fromJSON, calculateStatistics, L1, L2, data, orderedL1, orderedL2, media
};