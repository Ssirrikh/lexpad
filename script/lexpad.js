
console.log(`Inline JS running successfully.`);

// DOM anchors
const eNavTabs = [
    document.getElementById('navtab-0'),
    document.getElementById('navtab-1'),
    document.getElementById('navtab-2')
];
const eStatbarLeft = document.getElementById('statbar-left');
const eStatbarRight = document.getElementById('statbar-right');
// dynamic DOM anchors
let eContent = document.getElementById('r-content');

// off-DOM content
const TAB_PROJECT = 0;
const TAB_LEXICON = 1;
const TAB_SEARCH = 2;
const tabContents = [];
(() => {
    let e = document.createElement('div');
        e.id = 'r-content';
        e.classList.add('flex-col');
    let eStr = ``;
    eStr += `<div id='project-lang-info' class='flex-col'>`;
        eStr += `<label id='label-lang-name' for='lang-name'>Language Full Name</label>`;
        eStr += `<input id='lang-name' type='text' spellcheck='false'>`;
        eStr += `<label id='label-lang-abbr' for='lang-abbr'>Abbreviation</label>`;
        eStr += `<input id='lang-abbr' type='text' spellcheck='false'>`;
        eStr += `<p class='subtitle'>2-3 letter abbreviation of language name, for example "eng" for English.</p>`;
        eStr += `<label id='label-lang-alph' for='lang-alph'>Alphabet</label>`;
        eStr += `<input id='lang-alph' type='text' spellcheck='false'>`;
        eStr += `<p class='subtitle'>Work in progress. Will eventually allow for custom alphabetization and multi-character letters.</p>`;
        // eStr += `<div class='separator-line'></div>`;
        // eStr += `<p id='wip-stats'>Project Statistics section coming soon.</p>`;
    eStr += `</div>`;
    eStr += `<p id='project-coming-soon'>Project statistics coming soon...</p>`;
    e.innerHTML = eStr;
    tabContents[TAB_PROJECT] = e;
})();
(() => {
    let e = document.createElement('div');
        e.id = 'r-content';
        e.classList.add('no-scrollbar');
        // easier to override unwanted styling than mess with container-ception everywhere else
        e.style.padding = '0';
    let eStr = ``;
    eStr += `<div id='lexicon-wrapper' class='flex-row'>`;
        // left panel: lexicon search
        eStr += `<div id='lexicon' class='flex-col'>`;
            eStr += `<div id='lexicon-header' class='flex-col'>`;
                eStr += `<input id='lexicon-search' type='text' spellcheck='false' placeholder='Search...'>`;
            eStr += `</div>`;
            eStr += `<div id='lexicon-content-header' class='flex-row'>`;
                eStr += `<p>Catg</p>`;
                eStr += `<p>Entry</p>`;
                eStr += `<div class='flex-sep'></div>`;
                eStr += `<p>Media</p>`;
            eStr += `</div>`;
            eStr += `<div id='lexicon-content' class='flex-col no-scrollbar'>`;
                eStr += `<div class='lexicon-entry active-entry'>to run; to sprint</div>`;
                for (let i = 0; i < 30; i++) eStr += `<div class='lexicon-entry'>Entry ${i}</div>`;
            eStr += `</div>`;
        eStr += `</div>`;
        // right panel: entry editor
        eStr += `<div id='entry-editor' class='flex-col'>`;
            // entry header
            eStr += `<div id='entry-header' class='flex-row'>`;
                eStr += `<label for='entry-L1'>English Word(s)</label>`;
                eStr += `<input id='entry-L1' type='text' >`;
                eStr += `<div class='flex-row flex-fill'>`;
                    eStr += `<p id='entry-catg'>---</p>`;
                eStr += `</div>`;
                eStr += `<button id='entry-image'>No Image</button>`;
            eStr += `</div>`;
            eStr += `<div id='entry-content' class='flex-col'>`;
                // wordforms
                eStr += `<h3 class='section-title'>Wordforms <span id='entry-forms-count'>(13)</span></h3>`;
                eStr += `<div class='flex-row entry-legend'>`;
                    eStr += `<p id='entry-forms-legend-case'>Form/Case</p>`;
                    eStr += `<p id='entry-forms-legend-form'>Wikchamni Word</p>`;
                    // eStr += `<div class='flex-sep'></div>`;
                    eStr += `<p class='flex-fill'>Audio</p>`;
                    // eStr += `<div class='flex-sep'></div>`;
                    eStr += `<p id='entry-forms-legend-options'></p>`;
                eStr += `</div>`;
                eStr += `<div id='entry-forms-wrapper' class='flex-col'>`;
                    // eStr += `<div class='flex-row entry-form-wrapper'>Wordform 0</div>`;
                    for (let i = 0; i < 6; i++) eStr += `<div class='flex-row entry-form-wrapper'>Wordform ${i}</div>`;
                eStr += `</div>`;
                eStr += `<button id='entry-add-wordform' class='button-highlight'>Add New Wordform</button>`;
                // sentences
                eStr += `<h3 class='section-title'>Sentences <span id='entry-sentences-count'>(5)</span></h3>`;
                eStr += `<div class='flex-row entry-legend'>`;
                    eStr += `<p id='entry-sents-legend-case'>Form/Case</p>`;
                    eStr += `<div class='flex-sep'></div>`;
                    eStr += `<p>Audio</p>`;
                    eStr += `<div class='flex-sep'></div>`;
                    eStr += `<p id='entry-sents-legend-options'></p>`;
                eStr += `</div>`;
                eStr += `<div id='entry-sentences-wrapper' class='flex-col'>`;
                    // eStr += `<div class='flex-row entry-sentence-wrapper'>Sentence 0</div>`;
                    // for (let i = 0; i < 3; i++) eStr += `<div class='flex-row entry-sentence-wrapper'>Sentence ${i}</div>`;
                eStr += `</div>`;
                eStr += `<button id='entry-add-sentence' class='button-highlight'>Add New Sentence</button>`;
                // notes
                eStr += `<h3 class='section-title'>Notes <span id='entry-notes-count'>(2)</span></h3>`;
                eStr += `<div id='entry-notes-wrapper' class='flex-col'>`;
                    eStr += `<div class='flex-col entry-note-wrapper'>`;
                        eStr += `<p>Note #1</p>`;
                        eStr += `<textarea rows='3'>Related language Chukchansi tʰixtʰinitʰ 'sick'</textarea>`;
                    eStr += `</div>`;
                    eStr += `<div class='flex-col entry-note-wrapper'>`;
                        eStr += `<p>Note #2</p>`;
                        eStr += `<textarea rows='3'>Other note</textarea>`;
                    eStr += `</div>`;
                eStr += `</div>`;
                eStr += `<button id='entry-add-note' class='button-highlight'>Add New Note</button>`;
                // danger zone
                eStr += `<div class='separator-line'></div>`;
                eStr += `<div class='flex-col'>`;
                    eStr += `<h3 id='entry-danger-zone-header' class='flex-col'>The Danger Zone</h3>`;
                    eStr += `<div id='entry-danger-zone' class='flex-col'>`;
                        eStr += `<div class='flex-row'>`;
                            eStr += `<button id='entry-delete' class='button-caution'>Delete Entry</button>`;
                            eStr += `<p>This will delete the current entry PERMANENTLY. This action cannot be undone.</p>`;
                        eStr += `</div>`;
                    eStr += `</div>`;
                eStr += `</div>`;
            eStr += `</div>`;
        eStr += `</div>`;
        // eStr += ``;
    eStr += `</div>`;
    e.innerHTML = eStr;
    e.querySelector('#entry-forms-count').onclick = () => tryLoadEntry(0);
    tabContents[TAB_LEXICON] = e;
})();

const nWelcomePage = (() => {
    let e = document.createElement('div');
        e.id = 'r-content';
        e.classList.add('no-scrollbar');
    let eStr = ``;
    eStr += `<div id='welcome' class='flex-col no-scrollbar'>`;
        eStr += `<h1>Welcome to LexPad</h1>`;
        eStr += `<div class='flex-row'>`;
            eStr += `<button id='btn-open-project' class='button-highlight'>Open Project</button>`;
            eStr += `<button id='btn-new-project' class='button-highlight'>New Project</button>`;
        eStr += `</div>`;
    eStr += `</div>`;
    e.innerHTML = eStr;
    e.querySelector('#btn-open-project').onclick = () => tryOpenProject(); // needs to be lambda, so function can be hoisted properly
    // document.getElementById('btn-open-project').onclick = tryOpenProject;
    return e;
})();

// const tplFormSelect = (() => {
//     let tpl = document.createElement('template');
//     let eStr = ``;
//     eStr += ``;
//     tpl.innerHTML = eStr;
//     return tpl;
// })();



// program state
let project = {
    path : ``,
    modified : false
};
let L1 = {
	"name" : "English",
	"abbr" : "eng",
	"alph" : "a b c d e f g h i j k l m n o p q r s t u v w x y z",
	"usesForms" : false
};
let L2 = {};
let orderedWordsL1 = [];
let orderedWordsL2 = [];
let activeEntry = {};

const tryOpenProject = async () => {
    const res = await window.electronAPI.openProject();
    console.log(res);
    if (res.canceled) return;
    if (res.error) { console.error(res.message); return; }
    // TODO: check for unsaved changes, prompt user if necessary
    // if file valid, record its location and try to load parsed lang info
    project.path = res.path;
    console.log(`Loading project: ${project.path}`);
    eStatbarLeft.textContent = project.path;
    await tryGetLangInfo(); // refreshes project tab
};
const tryGetLangInfo = async () => {
    const res = await window.electronAPI.getLangInfo();
    console.log(res);
    if (res.error) { console.error(res.message); return; }
    // save data in renderer context, then refresh project tab
    L2 = res.L2;
    buildProjectTab();
    loadTab(TAB_PROJECT);
};
const tryLoadEntry = async (i) => {
    const res = await window.electronAPI.getEntry(i);
    console.log(res);
    if (res.error) { console.error(res.message); return; }
    // set as active entry, then refresh UI
    activeEntry = res;
    // debug mod form select template
    let tpl = document.getElementById('tpl-form-select');
    let opt = document.createElement('option');
        opt.value = '9';
        opt.textContent = 'New Option';
    // setting innerHTML seems to be the only way to mod a template; it's all or nothing
    tpl.innerHTML = `<select><option value='-1'>New Option</option></select>`;
    // TODO: rebuild entry editor window
    tabContents[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = '';
    tabContents[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
    for (let i = 0; i < activeEntry.L2.length; i++) renderWordform(i);
    // for (let i = 0; i < activeEntry.L2.length; i++) {
    //     //
    // }
    tabContents[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
    tabContents[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sentences.length})`;
    for (let i = 0; i < activeEntry.sentences.length; i++) renderSentence(i);
    tabContents[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
    tabContents[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
    for (let i = 0; i < activeEntry.notes.length; i++) renderNote(i);
};



// Project Tab

const buildWelcomePage = () => {
    eContent.replaceWith(nWelcomePage);
    eContent = document.getElementById('r-content'); // need to rebind var to whatever content container is active
};
const buildProjectTab = () => {
    if (!project.path) {
        buildWelcomePage();
    } else {
        tabContents[TAB_PROJECT].querySelector('#lang-name').value = L2.name;
        tabContents[TAB_PROJECT].querySelector('#lang-abbr').value = L2.abbr;
        tabContents[TAB_PROJECT].querySelector('#lang-alph').value = L2.alph;
    }
};



// Lexicon Tab

const renderWordform = i => {
    // TODO: use refreshable off-DOM <template> elems instead of innerHTML constructor strings
        // support nesting of <template> elems
        // entry-wordform <template> has blank <option id='replace-me'>
        // create second <template> containing actual constructed <option>
        // then use wordformTemplate.clone().querySelector('replace-me').replaceWith(optionsTemplate.clone())

    console.log(`Render form ${i}`);

    let e = document.createElement('div');
        e.classList.add('flex-row');
        e.classList.add('entry-form-wrapper');
    // form <select>
    e.appendChild( document.getElementById('tpl-form-select').content.cloneNode(true) );
    // word <input>
    let eFormContent = document.createElement('input');
    Object.assign(eFormContent, {
        id : `entry-form-${i}-content`,
        type : 'text',
        spellcheck : 'false',
        value : activeEntry.L2[i].synonyms.join('; '),
        // value : 'hello world'
    });
    e.appendChild(eFormContent);
    // audio
    let eFormAudio = document.createElement('div');
        eFormAudio.classList.add('flex-row');
        eFormAudio.classList.add('flex-fill');
        eFormAudio.classList.add('entry-audio-gallery');
        eFormAudio.innerHTML = `<p class='entry-no-audio'>No Audio</p><button class='icon-plus'></button>`;
    e.appendChild(eFormAudio);
    // menu
    let eMenuButton = document.createElement('button');
        eMenuButton.classList.add('icon-tridot');
    e.appendChild(eMenuButton);
    let eMenu = document.createElement('div');
        eMenu.id = `entry-form-${i}-menu`;
        eMenu.classList.add('flex-col');
        eMenu.classList.add('options-menu');
        // eMenu.style.visibility = 'hidden';
        eMenu.innerHTML = `<button id='entry-form-${i}-manage-audio' class='menu-option-standard'>Manage Audio</button><div class='menu-separator'></div><button id='entry-form-${i}-delete' class='menu-option-caution'>Delete Wordform</button>`;
    e.appendChild(eMenu);
    // events
    tabContents[TAB_LEXICON].querySelector('#entry-forms-wrapper').appendChild(e);
};
const renderSentence = i => {
    let e = document.getElementById('tpl-entry-sentence').content.cloneNode(true);
    e.querySelector('select').replaceWith( document.getElementById('tpl-form-select').content.cloneNode(true) ); // insert pre-built form <select>
    e.querySelector('.entry-sentence-L1').value = activeEntry.sentences[i].L1;
    e.querySelector('.entry-sentence-L1').onblur = () => console.log(`Saving sentence ${i} L1...`);
    e.querySelector('.entry-sentence-L2').value = activeEntry.sentences[i].L2;
    e.querySelector('.entry-sentence-L2').onblur = () => console.log(`Saving sentence ${i} L2...`);
    tabContents[TAB_LEXICON].querySelector('#entry-sentences-wrapper').appendChild(e);
};
const renderNote = i => {
    let e = document.createElement('div');
        e.classList.add('flex-col');
        e.classList.add('entry-note-wrapper');
    let eNoteTitle = document.createElement('p');
        eNoteTitle.textContent = `Note #${i+1}`;
    e.appendChild(eNoteTitle);
    let eNoteContent = document.createElement('textarea');
        eNoteContent.rows = 3;
        eNoteContent.textContent = activeEntry.notes[i];
    e.appendChild(eNoteContent);
    tabContents[TAB_LEXICON].querySelector('#entry-notes-wrapper').appendChild(e);
};



// Search Tab

//



// tab switching
function loadTab (tabId) {
    console.log(`Load tab ${tabId}`);
    // disable tabs if no project is open
    if (!project.path) return;
    // update tabs
    for (let i = 0; i < eNavTabs.length; i++) {
        if (i === tabId && !eNavTabs[i].classList.contains('active-navtab')) {
            eNavTabs[i].classList.add('active-navtab');
        } else if (i !== tabId && eNavTabs[i].classList.contains('active-navtab')) {
            eNavTabs[i].classList.remove('active-navtab');
        }
    }
    // update contents
    if (tabId < tabContents.length) {
        eContent.replaceWith(tabContents[tabId]);
        eContent = document.getElementById('r-content'); // need to rebind var to whatever content container is active
    }
}

buildProjectTab();
// tryLoadEntry(0);

// attach event handlers
for (let i = 0; i < eNavTabs.length; i++) {
	eNavTabs[i].onclick = e => loadTab(i);
}
eStatbarRight.onclick = e => window.electronAPI.flipToggle();
eStatbarLeft.onclick = async e => {
    const res = await window.electronAPI.openProject();
    console.log(res);
}



// (async () => {
//     // test confirms objects get deep copied when piped from main to renderer
//     // changes here will not mutate data on main
//     let res = await window.electronAPI.requestObject();
//     console.log(res);
//     res.v = 9;
//     console.log(res);
//     window.electronAPI.checkObject();
// })();