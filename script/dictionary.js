
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

// program state
let file = {
	path : ``,
	filename : ``,
	modified : false
};
let project = {
    activeEntry : 3,
	catgs : {}
};
// language data
let catgs = {};
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
const fromJSON = (path,jsonRaw) => {
	// store json parse, and allow raw filestring to be GC'd
	let jsonParse = tryParseJSON(jsonRaw);
	console.log(jsonParse);
	
	//// TODO: clean unsafe arbitrary text fields

	// reset project
	file.path = path.replace(/\\[^\\]+?$/,'');
	file.filename = path.replace(/^.+\\/,'');
	file.modified = false;
	// link parsed data
	project = jsonParse.project ?? structuredClone(DEFAULT_PROJECT);
	L2 = jsonParse.language ?? structuredClone(DEFAULT_L2);
	data = jsonParse.lexicon ?? [];

	// block saved active-entry for dbg
	// project.activeEntry = -1;
	console.log(project.activeEntry);

	// index data
	// TODO: check if anything more than this is req'd to GC previously-open project
	orderedL1 = [];
	orderedL2 = [];
	for (let i = 0; i < data.length; i++) {
		// console.log(data[i]);
		orderedL1.push(...data[i].L1.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[i].catg,entryId:i}}));
		for (let form of data[i].L2) orderedL2.push(...form.L2.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[i].catg,entryId:i}}));
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
export { myObj, checkObj, replaceObj, file, project, fromJSON, catgs, L1, L2, data, orderedL1, orderedL2, media };