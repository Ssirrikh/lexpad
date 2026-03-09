
const DBG_VERBOSE = false;

const RE_MDF_TOKEN = /^\\([^\s]+)\s(.+)/;

const TOKEN_NEW_ENTRY = 'lx';

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

const importMDF = (mdf='') => {
    const tokenization = tokenize(mdf);
    console.log(tokenization.tokencounts);
	console.log(`${Object.keys(tokenization.tokencounts).length} token types, ${tokenization.tokenstream.length} tokens in stream, ${tokenization.tokencounts[TOKEN_NEW_ENTRY]} entries detected`);
    console.log(tokenization.tokenstream);
};



//// API ////

export {
	importMDF
};