const SYNONYM_SPLITTER = '; ';
const ALPHABET_SPLITTER = ' ';

function alphabetizeUnicode (a,b) {
	// alphabetization defaults to case-insensative unicode character order
	a = a.toLowerCase();
	b = b.toLowerCase();
	if (a > b) return 1;
	if (a < b) return -1;
	return 0;
}

class Language {
	constructor (name = 'New Language', abbreviation = 'lng', alphabet = '') {
		this.name = name;
		this.abbr = abbreviation;
		this.alphabet = alphabet.split(ALPHABET_SPLITTER);
		this.alphabetize = alphabetizeUnicode;
		this.usesForms = false;
		this.forms = {};
	}
	get abbreviation () { return this.abbr; }
	setCatgForms (catg, forms) {
		this.usesForms = true;
		for (let form of this.forms[catg]) {
			if (form) {
				console.warn(`Overwriting form names ${this.forms[catg]} -> ${forms}.`);
				break;
			}
		}
		this.forms[catg] = [];
		for (let form in forms) {
			this.forms[catg].push(form);
		}
	}
	addForm (catg, formNum, formName) {
		this.usesForms = true;
		if (!this.forms[catg]) {
			this.forms.catg = [];
		}
		if (this.forms[catg][formNum] && this.forms[catg][formNum] != formName) {
			console.warn(`Replacing ${catg} form ${formNum} "${this.forms[catg][formNum]}" with "${formName}" (${this.name}).`);
		}
		this.forms[catg][formNum] = formName;
	}
	getForm (catg, formNum) {
		if (this.forms[catg] && this.forms[catg][formNum]) {
			return this.forms[catg][formNum];
		} else {
			// return `Form ${formNum}`;
			return '';
		}
	}
	hasForm (catg, formNum) {
		return this.forms[catg] && this.forms[catg][formNum];
	}
	toJSON () {
		let o = {
			name : this.name ?? "",
			abbr : this.abbr ?? "",
			alphabet : this.alphabet.join(ALPHABET_SPLITTER),
			usesForms : this.usesForms,
			forms : {}
		};
		for (let catg in this.forms) {
			o.forms[catg] = [];
			for (let formNum = 0; formNum < this.forms[catg].length; formNum++) {
				o.forms[catg][formNum] = this.forms[catg][formNum];
			}
		}
		return JSON.stringify(o);
	}
	fromJSON (s) {
		let o = JSON.parse(s);
		this.name = o.name ?? "";
		this.abbr = o.abbr ?? "";
		this.alphabet = (o.alphabet) ? o.alphabet.split(ALPHABET_SPLITTER) : [];
		this.usesForms = o.usesForms ?? (Object.keys(o.forms).length > 0);
		this.forms = {};
		for (let catg in o.forms) {
			this.forms[catg] = [];
			for (let formNum = 0; formNum < o.forms[catg].length; formNum++) {
				this.forms[catg][formNum] = o.forms[catg][formNum];
			}
		}
	}
}



//// global helpers ////

const RE_ESCAPE = /[&<>"']/g;
const RE_MAP_ESCAPE = { "&" : "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }; // all contexts support &#39; but not all support &apos;, so ignore it
function escapeHTML (s) {
	return String(s).replace(RE_ESCAPE, c => RE_MAP_ESCAPE[c]);
}

