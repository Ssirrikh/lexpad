
const VERSION = "v0.0";

const RE_SYNONYM_SPLITTER = /;\s*/;

const SYNONYM_SPLITTER = '; ';
const ALPHABET_SPLITTER = ' ';

const MEDIA_TYPE_INVALID = -1;
const MEDIA_TYPE_AUDIO = 0;
const MEDIA_TYPE_IMAGE = 1;



//// global helpers ////

// file selection
	// https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
	// Chromium Images: jpeg, webp, gif, png, apng, <canvas>/blob, bmp, ico
	// https://www.chromium.org/audio-video/
	// Chromium Audio Codecs: flac, mp3, opus, pcm, vorbis
	// => mp3, wav, ogg + mpeg, 3gp + mp4, adts, flac, webm
// TODO: test supported file types exhaustively
const SUPPORTED_IMAGES = Object.freeze(['bmp','jpeg','jpg','png','webp']);
const SUPPORTED_AUDIO = Object.freeze(['mp3','mpeg','ogg','wav']);
// const RE_SUPPORTED_IMAGES = /^.*\.(bmp|jpe?g|png|webp)$/i;
const RE_SUPPORTED_IMAGES = new RegExp(`^.+\\.(${SUPPORTED_IMAGES.join('|')})$`, 'i');
const RE_SUPPORTED_AUDIO = new RegExp(`^.+\\.(${SUPPORTED_AUDIO.join('|')})$`, 'i');
const mediaType  = (filepath = '') => {
	if (RE_SUPPORTED_AUDIO.test(filepath)) return MEDIA_TYPE_AUDIO;
	if (RE_SUPPORTED_IMAGES.test(filepath)) return MEDIA_TYPE_IMAGE;
	return MEDIA_TYPE_INVALID;
};

// console.log(`mediaType('boop.png') = ${mediaType('boop.png')}`);
// console.log(`mediaType('boop.PNG') = ${mediaType('boop.PNG')}`);
// console.log(`mediaType('bap.wav') = ${mediaType('bap.wav')}`);
// console.log(`mediaType('lazerz.txt') = ${mediaType('lazerz.txt')}`);
// console.log(`mediaType('') = ${mediaType('')}`);
// console.log(`mediaType(69) = ${mediaType(69)}`);
// console.log(`mediaType('file/.mp3/trick.pdf') = ${mediaType('file/.mp3/trick.pdf')}`);

const RE_ESCAPE = /[&<>"']/g;
const RE_MAP_ESCAPE = { "&" : "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }; // all contexts support &#39; but not all support &apos;, so ignore it
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



//// DEFAULTS AND PRESETS /////////////////////////////////////////////////////////////

const L1 = Object.freeze({
	"name" : "English",
	"abbr" : "eng",
	"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
	"usesForms" : false
});



//// DATA /////////////////////////////////////////////////////////////////////

//// PROGRAM STATE ////

// active project file (should always mirror copy in main process)
let file = {
	isOpen : false,
	path : ``,
	filename : ``,
	modified : false
};
// active file's parsed contents
let fileContents = { // replaced by JSON.parse(rawFile)
	project : {},
	language : {},
	lexicon : []
};

//// ACCESS POINTS ////

// exporting a module-scoped object allows both modification+replacement w/o breaking link (let target = {})
// exporting an object which is a property of a module-scoped object does not (let obj = {target : {}})
	// access points serve as named pointers to object properties
	// must be rebound whenever the property is set (else will point to old obj)
	// let obj = {prop:...}; let propAccess = obj.prop; obj.prop = ...; propAccess = obj.prop;
	// export { propAccess };

// access points for project file
let project, L2, data; // access points [project,L2,data] correspond to proj obj [project,language,lexicon]
// access points for indexing
let orderedL1, orderedL2;
let sentences;
let media;
let stats;

// access points must be rebound whenever object property is redeclared, so they point to new object
const rebindProjectAccess = () => {
	// TODO: use memory snapshot to make sure old objects successfully GC'd
	project = fileContents.project;
	L2 = fileContents.language;
	data = fileContents.lexicon;
};
const rebindIndexAccess = () => {
	// TODO: use memory snapshot to make sure old objects successfully GC'd
	orderedL1 = indexing.orderedL1;
	orderedL2 = indexing.orderedL2;
	sentences = indexing.sentences;
	media = indexing.media;
	stats = indexing.stats;
};

//// DATA INDEXING ////

let indexing = {
	// indexed data
	orderedL1 : [], // array of {wordL1,catg,entryId,hasAudio,hasImage} sorted alphabetically by obj.word
	orderedL2 : [], // array of {wordL2,catg,entryId,hasAudio,hasImage} sorted alphabetically by obj.word
	// orderedCatgs : [], // array of catg abbreviations sorted alphabetically
	sentences : {
		wordInventory : new Set(), // set of unique words in L2 (lowercase, smart quotes normalized)
		wordsWithoutCoverage : new Set(), // set of unique words in L2 sentences that are NOT recorded as an L2 wordform in the lexicon (lowercase, smart quotes normalized)
		// calc coverage = (wordInventory.size - wordsWithoutCoverage.size) / wordInventory.size
	},
	media : {
		// available => file exists in /project/assets
		// referenced => file referenced by at least one lexicon entry
		// invalid => file type unrecognized (may or may not be unsupported)
		imagesAvailable : new Set(), // set of unique filenames in /assets directory
		imagesReferenced : {}, // hash table referenced[filename] = [...array of entryId where file is referenced]
		audioAvailable : new Set(),
		audioReferenced : {},
		invalidAvailable : new Set(),
		invalidReferenced : {},
		// missing => referenced but not available
		// unused => available but not referenced
		imagesMissing : new Set(),
		imagesUnused : new Set(),
		audioMissing : new Set(),
		audioUnused : new Set(),
		invalidMissing : new Set(),
		invalidUnused : new Set(),
	},
	stats : {
		numEntries : 0,
		numWordsL1 : 0,
		numWordsL2 : 0,
		numSentences : 0,
		numNotes : 0,
		numEntriesWithAudio : 0,
		numEntriesWithImage : 0,
		numAudioReferenced : 0, // number of references to any audio by any datafield (NOT the number of uniq audio files which were referenced!)
		numImagesReferenced : 0, // number of references to any image by any datafield (NOT the number of uniq image files which were referenced!)
		catgCounts : {},
		catgCountMisc : 0, // blank and unregistered catgs will be treated as misc
		// unregistered catgs shouldn't be possible unless JSON is edited outside LexPad
		catgFormCounts : {}, // catgFormCounts[catg][form] = 0
	},

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
const indexLexicon = (forceRebind) => {
	// TODO: use mem snapshot to check if wholesale replacement properly GCs prev contents
	const t0_indexLexicon = performance.now();
	indexing.orderedL1 = [];
	indexing.orderedL2 = [];
	for (let entryId = 0; entryId < data.length; entryId++) {
		// console.log(data[entryId]);
		const hasImage = data[entryId].images?.length > 0;
		const hasAudio = data[entryId].L2?.some(form => form.audio?.length > 0) || data[entryId].sents?.some(sentence => sentence.audio?.length > 0);
		indexing.orderedL1.push(...data[entryId].L1.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[entryId].catg,entryId:entryId,hasAudio:hasAudio,hasImage:hasImage}}));
		for (let form of data[entryId].L2) indexing.orderedL2.push(...form.L2.split(SYNONYM_SPLITTER).map(w => {return {word:w,catg:data[entryId].catg,entryId:entryId,hasAudio:hasAudio,hasImage:hasImage}}));
		// TODO: add Set() of forms to index cards
	}
	indexing.orderedL1.sort(alphabetizeIndex);
	indexing.orderedL2.sort(alphabetizeIndex);
	console.log(indexing.orderedL1);
	if (forceRebind) rebindIndexAccess(); // allow other modules to trigger rebinds
	console.log(`Indexed ${data.length} lexicon entries in ${Math.round(performance.now()-t0_indexLexicon)} ms.`);
};
const indexSentences = (forceRebind) => {
	const t0_indexSentences = performance.now();
	// disable smart quotes while indexing, since "it’s" and "it's" would be treated as separate words
	const RE_SMART_QUOTES = /[‘’ʼ]/g; // single quotes [‘’] char codes 8216,8217 and apostrophe [ʼ] char code 700 normalize to ASCII ['] char code 39
	// construct set of L2 lowercase alphanumeric characters, plus ['] for contractions and [-] for compounds
	// negated charset used to discard all other chars during indexing
	let characterInventory = new Set(`abcdefghijklmnopqrstuvwxyz0123456789'-` + L2.alph.toLowerCase().replaceAll(/\s+/g,'').replaceAll(RE_SMART_QUOTES,`'`));
	characterInventory.delete('-'); // explicitly handle [-] later, so it isn't treated as range
	// const STR_NON_ALNUM = `[^${[...characterInventory].join('')}]`;
	// console.log(STR_NON_ALNUM);
	// const RE_NON_ALNUM = new RegExp(STR_NON_ALNUM, 'g');
	const RE_NON_ALNUM = new RegExp(`[^${[...characterInventory].join('')}-]`, 'g'); // placing [-] at end of charset treats it as char instead of range
	console.log(`RE_NON_ALNUM "${RE_NON_ALNUM}"`);
	const RE_NUMERIC_WORD = /[0-9]+/g;
	
	// index all words in L2 forms
	let wordInventoryL2 = new Set();
	let wordInventorySentences = new Set();
	for (let entry of data) {
		for (let form of entry.L2 ?? []) {
			let synonyms = form.L2.split(SYNONYM_SPLITTER);
			for (let synonym of synonyms) {
				// console.log(`FORM ${synonym}`);
				wordInventoryL2.add( synonym.toLowerCase().replaceAll(RE_SMART_QUOTES,`'`).replaceAll(RE_NON_ALNUM,'') );
			}
		}
		for (let sentence of entry.sents ?? []) {
			let words = sentence.L2.trim().replaceAll(/\s+/g,' ') // scrub trailing/repeated whitespace
				.split(' ') // break into words
				.filter(x => !RE_NUMERIC_WORD.test(x)); // remove standalone numbers (accept 'thirty', reject '30')
			for (let word of words) {
				// console.log(`SENT "${word}" -> "${word.toLowerCase().replaceAll(RE_SMART_QUOTES,`'`).replaceAll(RE_NON_ALNUM,'')}"`);
				wordInventorySentences.add( word.toLowerCase().replaceAll(RE_SMART_QUOTES,`'`).replaceAll(RE_NON_ALNUM,'') );
			}
		}
	}
	// // discard empty strings (ex if user clicked "Add Wordform" but didn't type anything)
	// wordInventoryL2.delete('');
	// wordInventorySentences.delete('');
	// discard any words on the ignorelist, and empty strings
	let wordsWithoutCoverage = wordInventorySentences.difference(wordInventoryL2); // a.diff(b) => in a but not in b
	const ignorelist = project.ignorelist.toLowerCase().split(/\s+/);
	for (let word of ignorelist) {
		wordsWithoutCoverage.delete(word);
	}
	wordInventoryL2.delete('');
	wordInventorySentences.delete('');
	wordsWithoutCoverage.delete('');
	console.log(wordInventoryL2);
	console.log(wordInventorySentences);
	console.log(wordsWithoutCoverage);
	// to save mem, only keep data about what's NOT covered, since that's what the linguist needs to fix
	indexing.sentences = {};
	indexing.sentences.wordInventory = wordInventorySentences;
	indexing.sentences.wordsWithoutCoverage = wordsWithoutCoverage;

	// const sentenceWordsWithEntry = wordInventorySentences.intersection(wordInventoryL2); // a.intersect(b) === b.intersect(a)
	// const sentenceWordsWithoutEntry = wordInventorySentences.difference(wordInventoryL2); // a.diff(b) => in a but not in b
	// const coverage = sentenceWordsWithEntry.size / wordInventorySentences.size;
	// console.log(sentenceWordsWithEntry);
	// console.log(sentenceWordsWithoutEntry);
	// console.log(`${Math.round(100*coverage)}% coverage: ${sentenceWordsWithEntry.size} / ${wordInventorySentences.size} unique words in L2 sentences are recorded as an L2 wordform in the lexicon.`);

	if (forceRebind) rebindIndexAccess(); // allow other modules to trigger rebinds
	console.log(`Indexed sentences in ${Math.round(performance.now()-t0_indexSentences)} ms.`);
};
// const indexOrderedCatgs = () => {
// 	// TODO: decide if this is worth indexing; operation is cheap and not used often
// };
const indexAvailableMedia = (mediaList,forceRebind) => {
	console.log(mediaList);
	indexing.media.audioAvailable = new Set();
	indexing.media.imagesAvailable = new Set();
	indexing.media.invalidAvailable = new Set();
	for (let filename of mediaList ?? []) {
		// console.log(mediaType(filename));
		switch (mediaType(filename)) {
			// node.js lists files as "dir/file.ext", but chromium accesses files as "dir\file.ext"
			case MEDIA_TYPE_AUDIO: indexing.media.audioAvailable.add(filename.replace('/','\\')); break;
			case MEDIA_TYPE_IMAGE: indexing.media.imagesAvailable.add(filename.replace('/','\\')); break;
			case MEDIA_TYPE_INVALID:
			default:
				indexing.media.invalidAvailable.add(filename.replace('/','\\')); break;
		}
	}
	console.log(indexing.media.audioAvailable);
	console.log(indexing.media.imagesAvailable);
	console.log(indexing.media.invalidAvailable);
	if (forceRebind) rebindIndexAccess(); // allow other modules to trigger rebinds
};
const indexReferencedMedia = (forceRebind) => {
	const t0_indexMedia = performance.now();
	indexing.media.audioReferenced = {};
	indexing.media.imagesReferenced = {};
	indexing.media.invalidReferenced = {};
	for (let entryId = 0; entryId < data.length; entryId++) {
		// index audio
		for (let form of data[entryId].L2 ?? []) {
			for (let audio of form.audio ?? []) {
				if (!indexing.media.audioReferenced[audio]) indexing.media.audioReferenced[audio] = new Set();
				indexing.media.audioReferenced[audio].add(entryId);
			}
		}
		for (let sentence of data[entryId].sents ?? []) {
			for (let audio of sentence.audio ?? []) {
				if (!indexing.media.audioReferenced[audio]) indexing.media.audioReferenced[audio] = new Set();
				indexing.media.audioReferenced[audio].add(entryId);
			}
		}
		// index images
		for (let image of data[entryId].images ?? []) {
			if (!indexing.media.imagesReferenced[image]) indexing.media.imagesReferenced[image] = new Set();
			indexing.media.imagesReferenced[image].add(entryId);
		}
	}
	console.log(indexing.media.audioReferenced);
	console.log(indexing.media.imagesReferenced);
	if (forceRebind) rebindIndexAccess(); // allow other modules to trigger rebinds
	console.log(`Indexed ${Object.keys(indexing.media.audioReferenced).length} referenced audio files and ${Object.keys(indexing.media.imagesReferenced).length} referenced image files in ${Math.round(performance.now()-t0_indexMedia)} ms.`);
};
const indexMediaUsage = (forceRebind) => {
	const t0_indexMediaUsage = performance.now();
	// convert hash tables to sets
	const audioReferenced = new Set(Object.keys(indexing.media.audioReferenced));
	const imagesReferenced = new Set(Object.keys(indexing.media.imagesReferenced));
	const invalidReferenced = new Set(Object.keys(indexing.media.invalidReferenced));
	// a.diff(b) => in a but not in b
		// missing => referenced but not available
		// unused => available but not referenced
	indexing.media.audioMissing = audioReferenced.difference(indexing.media.audioAvailable);
	indexing.media.imagesMissing = imagesReferenced.difference(indexing.media.imagesAvailable);
	indexing.media.invalidMissing = invalidReferenced.difference(indexing.media.invalidAvailable);
	indexing.media.audioUnused = indexing.media.audioAvailable.difference(audioReferenced);
	indexing.media.imagesUnused = indexing.media.imagesAvailable.difference(imagesReferenced);
	indexing.media.invalidUnused = indexing.media.invalidAvailable.difference(invalidReferenced);
	// filter blank elements; they cannot occur except by user tampering and will be auto removed if accessed
	if (indexing.media.audioMissing.delete('')) console.log('Detected blank filename in missing audio');
	if (indexing.media.imagesMissing.delete('')) console.log('Detected blank filename in missing images');
	if (indexing.media.invalidMissing.delete('')) console.log('Detected blank filename in missing non-media');
	if (indexing.media.audioUnused.delete('')) console.log('Detected blank filename in unused audio');
	if (indexing.media.imagesUnused.delete('')) console.log('Detected blank filename in unused images');
	if (indexing.media.invalidUnused.delete('')) console.log('Detected blank filename in unused non-media');
	console.log('audio missing', indexing.media.audioMissing);
	console.log('audio unused', indexing.media.audioUnused);
	console.log('images missing', indexing.media.imagesMissing);
	console.log('images unused', indexing.media.imagesUnused);
	if (forceRebind) rebindIndexAccess(); // allow other modules to trigger rebinds
	console.log(`Media usage indexed in ${Math.round(performance.now()-t0_indexMediaUsage)} ms.`);
};

const calculateStatistics = (forceRebind) => {
	const t0_stats = performance.now();

	// reset stats
	indexing.stats = {
		numEntries : 0,
		numWordsL1 : 0,
		numWordsL2 : 0,
		numSentences : 0,
		numNotes : 0,
		numEntriesWithAudio : 0,
		numEntriesWithImage : 0,
		numAudioReferenced : 0,
		numImagesReferenced : 0,
		catgCounts : {}, // stats.catgCounts[catg] = 0
		catgCountMisc : 0,
		// blank and unregistered catgs will be treated as misc
		// unregistered catgs shouldn't be possible unless JSON is edited outside LexPad
		catgFormCounts : {}, // stats.catgFormCounts[catg][form] = 0
	};
	for (let catg in project.catgs) {
		indexing.stats.catgCounts[catg] = 0;
		indexing.stats.catgFormCounts[catg] = {};
		for (let form in L2.forms[catg] ?? []) {
			// console.log(catg, form, L2.forms[catg][form]);
			if (L2.forms[catg][form]) indexing.stats.catgFormCounts[catg][form] = 0;
		}
	}
	// rebind access point
	stats = indexing.stats;
	
	// count catgs,forms,L1,L2,sentences,notes,images,audio
	indexing.stats.numEntries = data.length ?? 0;
	for (let entry of data) {
		// catgs
		if (typeof indexing.stats.catgCounts[entry.catg] === 'number') {
			indexing.stats.catgCounts[entry.catg]++; // catg is defined
		} else {
			indexing.stats.catgCountMisc++; // catg is not defined
		}
		// wordcount
		if (entry.L1) {
			indexing.stats.numWordsL1 += entry.L1.split(RE_SYNONYM_SPLITTER).length ?? 0; // doesn't count empty L1 as word
		}
		// indexing.stats.numWordsL1 += entry.L1?.split(RE_SYNONYM_SPLITTER).length ?? 0; // doesn't count empty L1 as word
		for (let form of entry.L2 ?? []) {
			// TODO: this does not account for L2 synonyms
			if (form.L2) indexing.stats.numWordsL2++;
			if (typeof form.form === 'number' && form.form !== -1) indexing.stats.catgFormCounts[entry.catg][form.form]++;
		}
		// sentences and notes
		for (let sentence of entry.sents ?? []) {
			if (sentence.L1 || sentence.L2) indexing.stats.numSentences++;
		}
		for (let note of entry.notes ?? []) {
			if (typeof note.note === 'string') indexing.stats.numNotes++;
		}
		// images and audio
		let hasImages = false;
		for (let image of entry.images ?? []) {
			if (!image) continue;
			hasImages = true;
			indexing.stats.numImagesReferenced++;
		}
		if (hasImages) indexing.stats.numEntriesWithImage++;
		let hasAudio = false;
		for (let form of entry.L2 ?? []) { // nullish coalesce as shorthand for "if (obj.arr) { for (elem of arr) { ... } }"
			for (let audio of form.audio ?? []) {
				if (!audio) continue;
				hasAudio = true;
				indexing.stats.numAudioReferenced++;
			}
		}
		for (let sentence of entry.L2 ?? []) {
			for (let audio of sentence.audio ?? []) {
				if (!audio) continue;
				hasAudio = true;
				indexing.stats.numAudioReferenced++;
			}
		}
		if (hasAudio) indexing.stats.numEntriesWithAudio++;
	}
	if (forceRebind) rebindIndexAccess(); // allow other modules to trigger rebinds
	console.log(`Project statistics compiled in ${Math.round(performance.now()-t0_stats)} ms.`);
};



//// BATCH OPERATIONS ///////////////////////////////////////////////////////////////////////

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
	if (catgAbbr !== prevAbbr && Object.keys(project.catgs).indexOf(catgAbbr) !== -1) { console.error(`Another catg with abbreviation "${catgAbbr}" already exists. Abbreviations must be unique.`); return false; }

	// edit is valid, so update catg name
	if (catgAbbr !== prevAbbr) delete project.catgs[prevAbbr];
	project.catgs[catgAbbr] = catgName;
	console.log(project);
	// exit early if abbr didn't change
	if (catgAbbr === prevAbbr) {
		console.log(`Abbr did not change. Exiting early, no further changes necessary.`);
		return true;
	}
	console.log(`Catg abbr changed from "${prevAbbr}" to "${catgAbbr}". Updating forms and entries.`);
	// update forms
	L2.forms[catgAbbr] = L2.forms[prevAbbr].map(x => x); // deep copy forms off of prev abbr
	delete L2.forms[prevAbbr];
	console.log(L2);
	// update lexicon entries
	let numEntriesUpdated = 0;
	for (let entry of data) {
		if (entry.catg === prevAbbr) {
			entry.catg = catgAbbr;
			numEntriesUpdated++;
		}
	}
	console.log(`${numEntriesUpdated} entries of catg "${prevAbbr}" have been updated to "${catgAbbr}".`);
	// update index
	indexLexicon();
	calculateStatistics();
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
	indexing.orderedL1.push({ word:'', catg:catg, entryId:data.length-1, hasAudio:false, hasImage:false } );
	indexing.orderedL2.push({ word:'', catg:catg, entryId:data.length-1, hasAudio:false, hasImage:false } );
	return data.length - 1;
};
const deleteEntry = (entryId) => {
	if (entryId < 0 || entryId >= data.length) { console.error(`Cannot delete entry ${entryId}, out of bounds [0,${data.length}).`); return false; }
	data.splice(entryId,1);
	if (project.activeEntry === entryId) project.activeEntry = -1; // if the active entry just got deleted, unset reference to it
	return true;
	// for (let entryId = 0; entryId < indexing.orderedL1.length; entryId++) {
	// 	console.log(`${entryId}, ${indexing.orderedL1[entryId].entryId} vs ${entryId}`);
	// 	if (indexing.orderedL1[entryId].entryId === entryId) {
	// 		indexing.orderedL1.splice(entryId,1); // if index card belongs to target entry, delete it
	// 		entryId--;
	// 	}
	// }
	// for (let entryId = 0; entryId < indexing.orderedL2.length; entryId++) {
	// 	console.log(`${entryId}, ${indexing.orderedL2[entryId].entryId} vs ${entryId}`);
	// 	if (indexing.orderedL2[entryId].entryId === entryId) {
	// 		indexing.orderedL2.splice(entryId,1); // if index card belongs to target entry, delete it
	// 		entryId--;
	// 	}
	// }
};



//// FILE OPERATIONS //////////////////////////////////////////////////////////////////////

const fromJSON = (jsonRaw) => {
	const verboseParse = false;
	// raw filestring will be GC'd after function completion

	// store json parse in temp var, so currently-open project can remain open in case of parsing error
	let jsonParse = tryParseJSON(jsonRaw);
	if (verboseParse) console.log(jsonParse);
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
	rebindProjectAccess();
	if (verboseParse) console.log(project);
	if (verboseParse) console.log(L2);
	if (verboseParse) console.log(data);
	// TODO: check that old project is GC'd correctly

	// TODO: patch missing pieces of project file; update version if necessary
	// TODO: clean unsafe arbitrary text fields

	// index lexicon and media
	indexLexicon();
	indexReferencedMedia();
	rebindIndexAccess();
	if (verboseParse) {
		console.log(orderedL1);
		console.log(media.audioReferenced);
		console.log(media.imagesReferenced);
	}

	return true;
};
const toJSON = () => {
	return JSON.stringify(fileContents);
}



//// API ////

export {
	// constants
	SUPPORTED_AUDIO, SUPPORTED_IMAGES,
	// project components
	file, fromJSON, toJSON,
	project, L1, L2, data,
	// indexing
	orderedL1, orderedL2, indexLexicon,
	sentences, indexSentences,
	stats, calculateStatistics,
	media, indexAvailableMedia, indexReferencedMedia, indexMediaUsage,
	// batch ops
	createCatg, editCatg, deleteCatg,
	createForm, editForm, deleteForm,
	createEntry, deleteEntry
};