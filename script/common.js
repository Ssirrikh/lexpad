
//// LEXPAD ///////////////////////////

const VERSION = "v0.0.0";

const DEFAULTS = Object.freeze({
    //
});



//// MEDIA ////////////////////////////

const MEDIA_TYPE_INVALID = -1;
const MEDIA_TYPE_AUDIO = 0;
const MEDIA_TYPE_IMAGE = 1;

// file selection
	// https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
	// Chromium Images: jpeg, webp, gif, png, apng, <canvas>/blob, bmp, ico
	// https://www.chromium.org/audio-video/
	// Chromium Audio Codecs: flac, mp3, opus, pcm, vorbis
	// => mp3, wav, ogg + mpeg, 3gp + mp4, adts, flac, webm
// TODO: test supported file types exhaustively
const SUPPORTED_AUDIO = Object.freeze(['mp3','mpeg','ogg','wav']);
const SUPPORTED_IMAGES = Object.freeze(['bmp','jpeg','jpg','png','webp']);
const RE_SUPPORTED_AUDIO = new RegExp(`^.+\\.(${SUPPORTED_AUDIO.join('|')})$`, 'i');
const RE_SUPPORTED_IMAGES = new RegExp(`^.+\\.(${SUPPORTED_IMAGES.join('|')})$`, 'i');
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



//// TEXT PROCESSING //////////////////

const RE_SYNONYM_SPLITTER = /;\s*/;
const SYNONYM_JOIN = '; ';
const RE_ALPHABET_SPLITTER = /\s+/;
const ALPHABET_JOIN = ' ';

const capitalize = s => (s[0]??'').toUpperCase() + s.slice(1);
const truncate = (text,maxLen=null) => (maxLen === null || text.length <= maxLen) ? text : `${text.slice(0,maxLen)}...`; // if maxLen neg, trim n chars off end; if maxLen pos, act as max len

const RE_ESCAPE = /[&<>"']/g;
const RE_MAP_ESCAPE = { "&" : "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }; // all contexts support &#39; but not all support &apos;, so ignore it
const escapeHTML = (s) => String(s).replace(RE_ESCAPE, c => RE_MAP_ESCAPE[c]);



//// STRING GEN ///////////////////////

const DATE_MONTH_SHORT = Object.freeze(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);

const prettyPrintSet = (title,setToList) => {
	let arrFromSet = [...setToList].filter(x => x).sort(); // remove blanks and alphabetize
	if (arrFromSet.length === 0) arrFromSet.push(`// [no items in this section]`);
	return `//// ${title} (${setToList.size}) ////\n\n${arrFromSet.join('\n')}`;
};
const dateStr = () => {
	const today = new Date();
	const dd = String(today.getDate()).padStart(2,'0');
	const MMM = today.toLocaleString('default', { month: 'short' });
	const yyyy = today.getFullYear();
	return `${dd}/${MMM}/${yyyy}`;
};



//// API //////////////////////////////

export {
    // LexPad
    VERSION,
    // media
    MEDIA_TYPE_INVALID, MEDIA_TYPE_AUDIO, MEDIA_TYPE_IMAGE,
    SUPPORTED_AUDIO, RE_SUPPORTED_AUDIO,
    SUPPORTED_IMAGES, RE_SUPPORTED_IMAGES,
    mediaType,
    // text processing
    RE_SYNONYM_SPLITTER, SYNONYM_JOIN,
    RE_ALPHABET_SPLITTER, ALPHABET_JOIN,
    capitalize, truncate,
    // string gen
    DATE_MONTH_SHORT,
    prettyPrintSet,
    dateStr
};