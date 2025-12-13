
const RE_SYNONYM_SPLITTER = /;\s*/;

const SYNONYM_SPLITTER = '; ';
const ALPHABET_SPLITTER = ' ';

//// global helpers ////

const RE_ESCAPE = /[&<>"']/g;
const RE_MAP_ESCAPE = { "&" : "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }; // all contexts support &#39; but not all support &apos;, so ignore it
function escapeHTML (s) {
	return String(s).replace(RE_ESCAPE, c => RE_MAP_ESCAPE[c]);
}

// const alphabetizeIndex = (oa,ob) => {
// 	const a = oa.word.toLowerCase();
// 	const b = ob.word.toLowerCase();
// 	return a.localeCompare(b);
// };
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



//// 

//// PROGRAM STATE ////

// program state; should always mirror copy in main process
let file = {
	isOpen : false,
	path : ``,
	filename : ``,
	modified : false
};
let project = {
    activeEntry : 3,
	catgs : {}
};
// language data
const L1 = Object.freeze({
	"name" : "English",
	"abbr" : "eng",
	"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
	"usesForms" : false
});
let L2 = {};
// lexicon
let data = [];
// lexicon indexing
let orderedL1 = [];
let orderedL2 = [];
let media = {}; // hash table of referenced media, containing set of entryIds that reference each file


const DEFAULT_FILE = Object.freeze({
	path : '',
	modified : false
});
const DEFAULT_PROJECT = Object.freeze({
	activeEntry : -1,
	catgs : {}
});
const DEFAULT_L2 = Object.freeze({
	"name" : "English",
	"abbr" : "eng",
	"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
	"usesForms" : true,
	"forms" : {}
});



// deep copy and index json w/o storing refs, so it can be GC'd
const fromJSON = (jsonRaw) => {
	// store json parse, and allow raw filestring to be GC'd
	let jsonParse = tryParseJSON(jsonRaw);
	console.log(jsonParse);
	if (!jsonParse) return false; // report failure
	
	//// TODO: clean unsafe arbitrary text fields

	// TODO: prob want to leave jsonParse intact and simply bind refs to project/language/lexicon; will make saveProject() a single call of JSON.stringify()

	// link parsed data
	project = jsonParse.project ?? structuredClone(DEFAULT_PROJECT);
	L2 = jsonParse.language ?? structuredClone(DEFAULT_L2);
	data = jsonParse.lexicon ?? [];

	// block saved active-entry for dbg
	// project.activeEntry = -1;
	// console.log(project.activeEntry);

	// index data
	// TODO: check if anything more than this is req'd to GC previously-open project
	orderedL1 = [];
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


// formNum is index of form within entry's array of forms
// formId is linguist label corresponding to case/conjugation/etc
class LexiconEntryPolymorphic {
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
	addFormL2 (word, form = -1) { this.L2.push({ synonyms: word.split(SYNONYM_SPLITTER), formId: form }); }
	addSentence (sentL1, sentL2, form = -1) { this.sentences.push({ L1:sentL1, L2:sentL2, formId:form }); }
	addNote (note, form = -1) { this.notes.push({ note:note, formId:form }); }
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
	// export
	toJSON () {
		return {};
	}
}



// exporting an object allows direct modification of it
let myObj = {
	x : 7
};
const checkObj = () => console.log(myObj.x);
const replaceObj = () => myObj = {x:111};



//// API ////

//// ERR: when L2 is reset by a load, this remains bound to the old object
// const lexicon = {
// 	fromJSON : fromJSON,
// 	catgs : catgs,
// 	L1 : L1,
// 	L2 : L2,
// 	orderedL1 : orderedL1,
// 	orderedL2 : orderedL2
// };
// console.log(lexicon.L2);

// export { file, project, lexicon };

// directly exporting object allows both modification and replacement w/o breaking link
export { myObj, checkObj, replaceObj, file, project, fromJSON, calculateStatistics, L1, L2, data, orderedL1, orderedL2, media };