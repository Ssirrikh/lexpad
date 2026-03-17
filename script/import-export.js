
import * as common from "./common.js";
import { BlankProject, BlankEntry } from "./dictionary.js";



const DBG_VERBOSE = false;

const RE_MDF_TOKEN = /^\\([^\s]+)\s(.+)/;
const TOKEN_NEW_ENTRY = 'lx';
const TOKEN_CATG = 'ps';
const TOKEN_LAST_EDIT = 'dt';

//// TOKENIZER ///////////////////////////////////////////

const tokenize = (text) => {
	const t0_tokenize = performance.now();
    let tokencounts = {};
    let tokenstream = [];
	console.log(`Tokenizing text...`);

    // preprocess text
    let lines = text.replaceAll(/[\n\r]+/g,'\n').trim().split('\n'); // scrub CRLF and normalize whitespace
	for (let i = 0; i < lines.length; i++) {
        // rejoin long datafields that were split across multiple lines
		if (lines[i][0] !== '\\') {
            // any line that doesn't begin with a token type (\...) is a multiline datafield
			if (DBG_VERBOSE) console.log(`Rejoining multiline datafield: "${lines[i]}"`);
			lines[i-1] = `${lines[i-1]} ${lines[i]}`;
			lines.splice(i,1);
			i--;
		}
	}
    // for (let i = 0; i < 10; i++) {
	// 	if (lines[i]) console.log(lines[i]);
	// }

    // tokenize
    for (let line of lines) {
        // check for ill-formed tokens
        if (!line || line.length === 0 || line[0] !== '\\') {
			console.warn(`Skipping tokenless line "${line}"`);
			continue;
		}
		const match = line.match(RE_MDF_TOKEN);
		if (!match) {
			console.warn(`Failed to construct regex match for line "${line}"`);
			continue;
		}
		const [,type,contents] = match;
		if (!type || !contents) {
			console.warn(`Failed to match token in "${line}"`);
			console.warn(line.match(RE_MDF_TOKEN));
			continue;
		}
        // if line was a well-formed token, add it to the stream
		if (!tokencounts[type]) tokencounts[type] = 0;
		tokencounts[type]++;
		tokenstream.push({
			type : type,
			contents : contents,
		});
    }

	console.log(`Text tokenized in ${Math.round(performance.now() - t0_tokenize)} ms`);
    return {
		dt : performance.now() - t0_tokenize,
        tokencounts : tokencounts,
        tokenstream : tokenstream,
    };
};

// \lx ʔuko·nʼuʔtaš
// \ps v
// \ge made someone drink over and over again
// \sf C:\Linguistic data\wiksp\drink {caus rep aor}.wav
// \xv ʔulo·nʼuʔtʰaš naʔ tʰaŋ
// \xe I made him drink several times.
// \sfx C:\Linguistic data\wiksp\I made him drink several times.wav
// \u #ʔukun -i -ta -š 
// \mr causative repetitive aorist 
// \dt 25/Oct/2017

const parse = (tokenstream=[]) => {
	// track unhandled data so user can be notified w/o losing data
	let unhandledTokenTypes = {};
	// parse
	let project = BlankProject();
	let currEntry = null;
	// pointers to 
	let lastAttachpointType = -1; // attachpoint modified by subsequent tokens until replaced by next attachpoint
	let lastL2 = -1;
	let lastSentence = -1;
	let lastNote = -1;

	const registerCatg = (catg) => {
		if (!catg) { console.warn(`Catg was blank. Nothing registered.`); return; }
		if (!project.project.catgs[catg]) project.project.catgs[catg] = catg;
		if (!project.language.forms[catg]) project.language.forms[catg] = [];
	}
	const addL2 = (L2) => {
		if (!currEntry) { console.error('ERR No entry under construction. Cannot parse L2 wordform.'); return -1; }
		currEntry.L2.push({ "form" : -1, "L2" : String(L2) });
		lastL2 = currEntry.L2.length - 1;
		return lastL2;
	};

	for (let token of tokenstream) {
		switch (token.type) {
		case TOKEN_NEW_ENTRY:
			if (currEntry) project.lexicon.push(currEntry);
			// init new entry-under-construction
			currEntry = BlankEntry();
			lastL2 = -1;
			lastSentence = -1;
			lastNote = -1;
			// set headword
			addL2(token.contents);
			break;
		case TOKEN_CATG:
			currEntry.catg = token.contents;
			registerCatg(currEntry.catg);
			break;
		case TOKEN_LAST_EDIT:
			// LexPad uses same dd/MMM/yyyy format as Toolbox
			currEntry.lastEdit = token.contents;
			break;
		default:
			// log unrecognized tokens
			if (!unhandledTokenTypes[token.type]) unhandledTokenTypes[token.type] = 0;
			unhandledTokenTypes[token.type]++;
		}
	}
	// when tokenstream ends, push final entry-under-construction to project
	if (currEntry) project.lexicon.push(currEntry);

	return {
		parse : project,
		unhandledTokenTypes : unhandledTokenTypes,
	};
};

const importMDF = (mdf='') => {
    const tokenization = tokenize(mdf);
    console.log(tokenization.tokencounts);
	console.log(`${Object.keys(tokenization.tokencounts).length} token types, ${tokenization.tokenstream.length} tokens in stream, ${tokenization.tokencounts[TOKEN_NEW_ENTRY]} entries detected`);
    console.log(tokenization.tokenstream);
	const parsedMDF = parse(tokenization.tokenstream);
	console.log(parsedMDF);
	console.log(`Parse complete. ${parsedMDF.parse.lexicon.length} entries, ${Object.keys(parsedMDF.parse.project.catgs).length} catgs.`);
	console.log(`Unhandled token types:`);
	console.log(parsedMDF.unhandledTokenTypes);
};



//// API ////

export {
	importMDF
};