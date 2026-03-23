
import * as common from "./common.js";
import { BlankProject, BlankEntry } from "./dictionary.js";



const DBG_VERBOSE = false;

const RE_MDF_TOKEN = /^\\([^\s]+)\s(.+)/;

const TOKEN_NEW_ENTRY = 'lx';
const TOKEN_CATG = 'ps';
const TOKEN_LAST_EDIT = 'dt';
const TOKEN_CROSS_REFERENCE = 'cf';
const TOKEN_VARIANT = 'va';
const TOKEN_BORROWED_WORD = 'bw';

const TOKEN_EXAMPLE_L2 = 'xv';
const TOKEN_EXAMPLE_L1 = 'xe';

const TOKEN_GLOSS_L1 = 'ge';
const TOKEN_DEFINITION_L1 = 'de';

// paradigms are used by x-theme and v-base entries to label grammatical cases of L2 wordforms in a lexeme
const TOKEN_PARADIGM_UNDERLYING = 'u';

// v-base and v-theme paradigms (single attribute)
const TOKEN_PARADIGM_INDIRECTIVE = 'ind';
const TOKEN_PARADIGM_CAUSATIVE = 'caus';
const TOKEN_PARADIGM_IMPERATIVE = 'imp';
const TOKEN_PARADIGM_DESIDERATIVE = 'des';
const TOKEN_PARADIGM_DUBITATIVE = 'dub';
const TOKEN_PARADIGM_DURATIVE = 'dur';
const TOKEN_PARADIGM_AORIST = 'aor';
const TOKEN_PARADIGM_FUTURE = 'fut';
const TOKEN_PARADIGM_REPETITIVE = 'rep';
const TOKEN_PARADIGM_DISTRIBUTIVE = 'dist';
const TOKEN_PARADIGM_MEDIO_PASSIVE = 'm-pass';
const TOKEN_PARADIGM_PASSIVE = 'pass';
const TOKEN_PARADIGM_RETARDATIVE = 'ret';
const TOKEN_PARADIGM_ABSOLUTIVE = 'abs';
const TOKEN_PARADIGM_ADJUNCTIVE = 'adj';
const TOKEN_PARADIGM_CONTINUATIVE = 'cont';
// v-base and v-theme paradigms (multi attribute)
const TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL = 'r-r';
const TOKEN_PARADIGM_DURATIVE_PRESENT = 'd-pres';
const TOKEN_PARADIGM_DURATIVE_AORIST = 'd-aor';
const TOKEN_PARADIGM_PASSIVE_AORIST = 'p-aor';
const TOKEN_PARADIGM_CONSEQUENT_ADJUNCTIVE = 'c-adj';
const TOKEN_PARADIGM_CONSEQUENT_AGENTIVE = 'c-agt';
const TOKEN_PARADIGM_NEUTRAL_AGENTIVE = 'n-agt';
const TOKEN_PARADIGM_PASSIVE_FUTURE = 'p-fut';
const TOKEN_PARADIGM_CAUSATIVE_INCHOACTIVE = 'c-inc';
const TOKEN_PARADIGM_CAUSATIVE_REPETITIVE = 'c-rep';
// v-base and v-theme paradigms (gerundial)
const TOKEN_PARADIGM_RESULTATIVE_GERUNDIAL = 'r-ger';
const TOKEN_PARADIGM_NON_DIRECTIVE_GERUNDIAL = 'nd-ger';
const TOKEN_PARADIGM_PASSIVE_GERUNDIAL = 'p-ger';
const TOKEN_PARADIGM_PRECATIVE_GERUNDIAL = 'prec-ger';
const TOKEN_PARADIGM_PREDICATED_GERUNDIAL = 'pred-ger';
const TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL = 'm-ger';
// v-base and v-theme paradigms (verbal nouns)
const TOKEN_PARADIGM_NEUTRAL_VERBAL_NOUN = 'nv-n';
const TOKEN_PARADIGM_PASSIVE_VERBAL_NOUN = 'pv-n';

// n-theme paradigms
const TOKEN_PARADIGM_NOMINATIVE = 'nom';
const TOKEN_PARADIGM_ACCUSATIVE = 'acc';
const TOKEN_PARADIGM_DATIVE = 'dat';
const TOKEN_PARADIGM_ABLATIVE = 'abl';
const TOKEN_PARADIGM_LOCATIVE = 'loc';
const TOKEN_PARADIGM_PLURAL = 'pl';
const TOKEN_PARADIGM_INTENSIVE_POSSESSOR = 'i-poss';
const TOKEN_PARADIGM_ACQUISITIVE = 'acq';
const TOKEN_PARADIGM_INCHOACTIVE = 'inc';
const TOKEN_PARADIGM_GENITIVE = 'gen';
const TOKEN_PARADIGM_RESIDENT = 'res';
const TOKEN_PARADIGM_DECENDENT = 'dec';
const TOKEN_PARADIGM_DIMINUTIVE = 'dim';

// prn-theme paradigms
const TOKEN_PARADIGM_LABEL = 'pdl'; // \pdl contains name of grammatical case, followed by \pdv containing L2 wordform
// const TOKEN_PARADIGM_
// const TOKEN_PARADIGM_
// const TOKEN_PARADIGM_
// const TOKEN_PARADIGM_
// const TOKEN_PARADIGM_
// const TOKEN_PARADIGM_


const TOKEN_NOTE = 'nt';
const TOKEN_NOTE_ANTHROPOLOGY = 'na';
const TOKEN_NOTE_DISCUSSION = 'nd';
const TOKEN_NOTE_GRAMMAR = 'ng';
const TOKEN_NOTE_PHONETIC = 'np';
const TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION = 'sc';
const TOKEN_NOTE_ENCYLOPEDIA_ENTRY = 'ee';

const TOKEN_MEDIA_AUDIO = 'sfx';
const TOKEN_MEDIA_AUDIO_HEADWORD = 'fs';
const TOKEN_MEDIA_IMAGE = 'pc';

let PARSE_RUN_STARTERS = [
	// entry info
	TOKEN_NEW_ENTRY, TOKEN_LAST_EDIT, TOKEN_CROSS_REFERENCE,
	// wordforms/sentences
	TOKEN_EXAMPLE_L2,
	// paradigms (L2 wordforms)
	// v-base and v-theme
	TOKEN_PARADIGM_INDIRECTIVE, TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL, TOKEN_PARADIGM_CAUSATIVE, TOKEN_PARADIGM_IMPERATIVE, TOKEN_PARADIGM_DESIDERATIVE, TOKEN_PARADIGM_DUBITATIVE, TOKEN_PARADIGM_DURATIVE_PRESENT, TOKEN_PARADIGM_DURATIVE_AORIST, TOKEN_PARADIGM_DURATIVE, TOKEN_PARADIGM_AORIST, TOKEN_PARADIGM_PASSIVE_AORIST, TOKEN_PARADIGM_FUTURE, TOKEN_PARADIGM_RESULTATIVE_GERUNDIAL, TOKEN_PARADIGM_NON_DIRECTIVE_GERUNDIAL, TOKEN_PARADIGM_NEUTRAL_VERBAL_NOUN, TOKEN_PARADIGM_CONSEQUENT_ADJUNCTIVE, TOKEN_PARADIGM_CONSEQUENT_AGENTIVE, TOKEN_PARADIGM_NEUTRAL_AGENTIVE, TOKEN_PARADIGM_REPETITIVE,
	TOKEN_PARADIGM_PASSIVE_VERBAL_NOUN, TOKEN_PARADIGM_DISTRIBUTIVE, TOKEN_PARADIGM_MEDIO_PASSIVE, TOKEN_PARADIGM_PASSIVE_GERUNDIAL, TOKEN_PARADIGM_PASSIVE, TOKEN_PARADIGM_PASSIVE_FUTURE, TOKEN_PARADIGM_PRECATIVE_GERUNDIAL, TOKEN_PARADIGM_PREDICATED_GERUNDIAL, TOKEN_PARADIGM_UNDERLYING, TOKEN_PARADIGM_RETARDATIVE,
	TOKEN_PARADIGM_CAUSATIVE_INCHOACTIVE, TOKEN_PARADIGM_CAUSATIVE_REPETITIVE, TOKEN_PARADIGM_ABSOLUTIVE, TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL, TOKEN_PARADIGM_ADJUNCTIVE, TOKEN_PARADIGM_CONTINUATIVE,
	// n-theme
	TOKEN_PARADIGM_NOMINATIVE, TOKEN_PARADIGM_ACCUSATIVE, TOKEN_PARADIGM_DATIVE, TOKEN_PARADIGM_ABLATIVE, TOKEN_PARADIGM_LOCATIVE, TOKEN_PARADIGM_PLURAL, TOKEN_PARADIGM_INTENSIVE_POSSESSOR, TOKEN_PARADIGM_ACQUISITIVE, TOKEN_PARADIGM_INCHOACTIVE, TOKEN_PARADIGM_GENITIVE, TOKEN_PARADIGM_RESIDENT, TOKEN_PARADIGM_DECENDENT, TOKEN_PARADIGM_DIMINUTIVE,
	// prn-theme
	TOKEN_PARADIGM_LABEL,
	// notes
	TOKEN_NOTE, TOKEN_NOTE_ANTHROPOLOGY, TOKEN_NOTE_DISCUSSION, TOKEN_NOTE_GRAMMAR, TOKEN_NOTE_PHONETIC, TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION, TOKEN_NOTE_ENCYLOPEDIA_ENTRY,
	// media
	TOKEN_MEDIA_IMAGE,
];


// \mr (x3935) is "morphology info"
	// x-theme entries use it as actual morphology note
	// everything else uses it as "grammatical case of \lx"
// \lt (x20) is "literal meaning"
	// some attach to \lx, some attach to \xv
// \pdv (x89) is "paradigm vernacular"
	// exclusively occurs after \pdl "paradigm label" in prn-theme entries
	// \pdl contains name of grammatical case, \pdv contains L2 wordform
// \sn (x11) is "word sense"
	// should this use word_1,word_2,etc syntax?
// \va "variant" should only occur in non-x-theme entries
	// add to L2 headword with semicolon syntax

// \a (x4)
	// x3 appear in affix entries, and contain an alternation of the "headword" affix
	// x1 contains "ʔə·kʰa", in v-theme entry "ʔə·kʼa/"; should it be "ʔə·kʰa/"?
	// is \a "alternation"?
// \dis (x2)
	// x2 \dis "ṭʼiyʼṭʼiʼyʼwiʔin" and "puŋpiŋʼyiʔin" in v-base entries
	// x2 \dist "munʼšat" and "pʰawʼaʔa" in v-base entries
	// \dis not in live dictionary; is this "distributive" like \dist?
	// only appears in v-base
// \mn (x2) is "reference to main entry", which should link entries together
	// x1 occurence in entry "pukʰošitʰ" looks like actual main entry link; is there a reason to use \mn instead of \cf?
	// x1 occurence in entry "pukʼši" looks like mis-labeled /mr
// \mult-ger (x1)
	// there are x10 \m-ger and only x1 \mult-ger (in the entry "#munʼuš")
	// both only appear in v-base entries, and both are labeled "multiplicative gerundial"
	// should \m-ger and \mult-ger be merged?
// \pd (x5)
	// only appears in prn-theme entries for "first person", "second person", "third person", "this", and "that"
	// for 1st/2nd/3rd person, appears after \ge with the same contents as the \pd
	// for "this"/"that", \pd contains the text "demonstrative pronoun"
	// does this field convey meaningful info that you want to keep?


// \d-pass (x10)
	// not in live dictionary; believed to be "durative passive" case
	// only appears in v-base and v-theme
// \r-rv-n (x3)
	// not in live dictionary, possibly "reflexive-reciprocal verbal-noun"?
	// only appears in v-base
	// -iwsha, -iwish, -iwshit
// \r-r-adj (x3)
	// not in live dictionary, probably "reflexive reciprocal adjunctive"
	// only appears in v-base and v-theme
	


let tokenNames = {
	// paradigms are used by x-theme and v-base entries to label grammatical cases of L2 wordforms in a lexeme
	TOKEN_PARADIGM_UNDERLYING : 'Underlying',

	// v-base and v-theme paradigms (single attribute)
	TOKEN_PARADIGM_INDIRECTIVE : 'Indirective',
	TOKEN_PARADIGM_CAUSATIVE : 'Causative',
	TOKEN_PARADIGM_IMPERATIVE : 'Imperative',
	TOKEN_PARADIGM_DESIDERATIVE : 'Desiderative',
	TOKEN_PARADIGM_DUBITATIVE : 'Dubitative',
	TOKEN_PARADIGM_DURATIVE : 'Durative',
	TOKEN_PARADIGM_AORIST : 'Aorist',
	TOKEN_PARADIGM_FUTURE : 'Future',
	TOKEN_PARADIGM_REPETITIVE : 'Repetitive',
	TOKEN_PARADIGM_DISTRIBUTIVE : 'Distributive',
	TOKEN_PARADIGM_MEDIO_PASSIVE : 'Medio-Passive',
	TOKEN_PARADIGM_PASSIVE : 'Passive',
	TOKEN_PARADIGM_RETARDATIVE : 'Retardative',
	TOKEN_PARADIGM_ABSOLUTIVE : 'Absolutive',
	TOKEN_PARADIGM_ADJUNCTIVE : 'Adjunctive',
	TOKEN_PARADIGM_CONTINUATIVE : 'Continuative',

	// v-base and v-theme paradigms (multi attribute)
	TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL : 'Reflexive-Reciprocal',
	TOKEN_PARADIGM_DURATIVE_PRESENT : 'Durative Present',
	TOKEN_PARADIGM_DURATIVE_AORIST : 'Durative Aorist',
	TOKEN_PARADIGM_PASSIVE_AORIST : 'Passive Aorist',
	TOKEN_PARADIGM_CONSEQUENT_ADJUNCTIVE : 'Consequent Adjunctive',
	TOKEN_PARADIGM_CONSEQUENT_AGENTIVE : 'Consequent Agentive',
	TOKEN_PARADIGM_NEUTRAL_AGENTIVE : 'Neutral Agentive',
	TOKEN_PARADIGM_PASSIVE_FUTURE : 'Passive Future',
	TOKEN_PARADIGM_CAUSATIVE_INCHOACTIVE : 'Causative Inchoactive',
	TOKEN_PARADIGM_CAUSATIVE_REPETITIVE : 'Causative Repetitive',

	// v-base and v-theme paradigms (gerundial)
	TOKEN_PARADIGM_RESULTATIVE_GERUNDIAL : 'Resultative Gerundial',
	TOKEN_PARADIGM_NON_DIRECTIVE_GERUNDIAL : 'Non-Directive Gerundial',
	TOKEN_PARADIGM_PASSIVE_GERUNDIAL : 'Passive Gerundial',
	TOKEN_PARADIGM_PRECATIVE_GERUNDIAL : 'Precative Gerundial',
	TOKEN_PARADIGM_PREDICATED_GERUNDIAL : 'Predicated Gerundial',
	TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL : 'Multiplicative Gerundial',

	// v-base and v-theme paradigms (verbal nouns)
	TOKEN_PARADIGM_NEUTRAL_VERBAL_NOUN : 'Neutral Verbal Noun',
	TOKEN_PARADIGM_PASSIVE_VERBAL_NOUN : 'Passive Verbal Noun',

	// n-theme paradigms
	TOKEN_PARADIGM_NOMINATIVE : 'Nominative',
	TOKEN_PARADIGM_ACCUSATIVE : 'Accusative',
	TOKEN_PARADIGM_DATIVE : 'Dative',
	TOKEN_PARADIGM_ABLATIVE : 'Ablative',
	TOKEN_PARADIGM_LOCATIVE : 'Locative',
	TOKEN_PARADIGM_PLURAL : 'Plural',
	TOKEN_PARADIGM_INTENSIVE_POSSESSOR : 'Intensive Possessor',
	TOKEN_PARADIGM_ACQUISITIVE : 'Acquisitive',
	TOKEN_PARADIGM_INCHOACTIVE : 'Inchoactive',
	TOKEN_PARADIGM_GENITIVE : 'Genitive',
	TOKEN_PARADIGM_RESIDENT : 'Resident',
	TOKEN_PARADIGM_DECENDENT : 'Decendent',
	TOKEN_PARADIGM_DIMINUTIVE : 'Diminutive',
};



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
	let recordedRuns = {};
	let nonRunStarters = {};
	// parse
	let project = BlankProject();
	let currEntry = null;

	// parse runs
	let streams = [];
	let runs = [];
	let run = null;
	for (let token of tokenstream) {
		// if we're starting a new entry, wrap up the last one
		if (token.type === TOKEN_NEW_ENTRY && runs) {
			streams.push(runs);
			runs = [];
		}
		// check if we need to start a new run (token seq)
		if (PARSE_RUN_STARTERS.indexOf(token.type) !== -1) {
			// record prev run
			if (run) runs.push(run.join(' '));
			// count non-run-starting tokens to check for tokens that still need to be parsed
			if (run) {
				for (let i = 0; i < run.length; i++) {
					if (i === 0) continue;
					if (!nonRunStarters[run[i]]) nonRunStarters[run[i]] = 0;
					nonRunStarters[run[i]]++;
				}
			}
			// start new run
			run = [];
		}
		// add token to run
		run.push(token.type);
	}
	// wrap up last run/entry
	if (run) runs.push(run.join(' '));
	streams.push(runs);

	console.log(`${Object.keys(nonRunStarters).length} tokens are parsed as non-run-starters`);
	console.log(nonRunStarters);

	// index runs
	let numRunsTokens = 0;
	for (let runs of streams) {
		for (let run of runs ?? []) {
			if (!recordedRuns[run]) recordedRuns[run] = 0;
			recordedRuns[run]++;
		}
	}
	console.log(`Num entries from runs is ${streams.length}`);
	console.log(`${Object.keys(recordedRuns).length} uniq runs recorded`);
	console.log(recordedRuns);


	// // pointers to 
	// let lastAttachpointType = -1; // attachpoint modified by subsequent tokens until replaced by next attachpoint
	// let lastL2 = -1;
	// let lastSentence = -1;
	// let lastNote = -1;

	// const registerCatg = (catg) => {
	// 	if (!catg) { console.warn(`Catg was blank. Nothing registered.`); return; }
	// 	if (!project.project.catgs[catg]) project.project.catgs[catg] = catg;
	// 	if (!project.language.forms[catg]) project.language.forms[catg] = [];
	// }
	// const addL2 = (L2) => {
	// 	if (!currEntry) { console.error('ERR No entry under construction. Cannot parse L2 wordform.'); return -1; }
	// 	currEntry.L2.push({ "form" : -1, "L2" : String(L2) });
	// 	lastL2 = currEntry.L2.length - 1;
	// 	return lastL2;
	// };

	// for (let token of tokenstream) {
	// 	switch (token.type) {
	// 	case TOKEN_NEW_ENTRY:
	// 		if (currEntry) project.lexicon.push(currEntry);
	// 		// init new entry-under-construction
	// 		currEntry = BlankEntry();
	// 		lastL2 = -1;
	// 		lastSentence = -1;
	// 		lastNote = -1;
	// 		// set headword
	// 		addL2(token.contents);
	// 		break;
	// 	case TOKEN_CATG:
	// 		currEntry.catg = token.contents;
	// 		registerCatg(currEntry.catg);
	// 		break;
	// 	case TOKEN_LAST_EDIT:
	// 		// LexPad uses same dd/MMM/yyyy format as Toolbox
	// 		currEntry.lastEdit = token.contents;
	// 		break;
	// 	default:
	// 		// log unrecognized tokens
	// 		if (!unhandledTokenTypes[token.type]) unhandledTokenTypes[token.type] = 0;
	// 		unhandledTokenTypes[token.type]++;
	// 	}
	// }
	// // when tokenstream ends, push final entry-under-construction to project
	// if (currEntry) project.lexicon.push(currEntry);

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