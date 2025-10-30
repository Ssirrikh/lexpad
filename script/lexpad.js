
console.log(`Inline JS running successfully.`);

const RE_SYNONYM_SPLITTER = /;\s*/;

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
let tplFormSelect = (() => {
    let e = document.createElement('template');
    e.innerHTML = `<select><option value='-1'>-- Select Option --</option><option value='+'>++ ADD NEW ++</option></select>`;
    return e;
})();

const buildFormSelect = (catg) => {
    console.log(`Building form selector for catg "${catg}"...`);
    // if target catg not encountered before, create it
    if (!L2.forms[catg]) L2.forms[catg] = [];
    // rebuild form select template for target catg
    let eStr = ``;
    eStr += `<select>`;
        eStr += `<option value='-1'>-- Select Option --</option>`;
        for (let i = 0; i < L2.forms[catg].length; i++) eStr += `<option value='${i}'>${L2.forms[catg][i]}</option>`;
        eStr += `<option value='+'>++ ADD NEW ++</option>`;
    eStr += `</select>`;
    // TODO: UNSAFE innerHTML with arbitrary input
    // setting innerHTML seems to be the only way to mod a template; it's all or nothing
    // need to clean this
    tplFormSelect.innerHTML = eStr;
};



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
let activeMenu = '';

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
    // set as active entry, and update sub-components
    activeEntry = res;
    buildFormSelect(activeEntry.catg);
    // rebuild header
    updateEditorHeader();
    // rebuild wordforms
    tabContents[TAB_LEXICON].querySelector('#entry-forms-wrapper').innerHTML = '';
    tabContents[TAB_LEXICON].querySelector('#entry-forms-count').textContent = `(${activeEntry.L2.length})`;
    for (let i = 0; i < activeEntry.L2.length; i++) renderWordform(i);
    // for (let i = 0; i < activeEntry.L2.length; i++) {
    //     //
    // }
    // rebuild sentences
    tabContents[TAB_LEXICON].querySelector('#entry-sentences-wrapper').innerHTML = '';
    tabContents[TAB_LEXICON].querySelector('#entry-sentences-count').textContent = `(${activeEntry.sentences.length})`;
    for (let i = 0; i < activeEntry.sentences.length; i++) renderSentence(i);
    // rebuild notes
    tabContents[TAB_LEXICON].querySelector('#entry-notes-wrapper').innerHTML = '';
    tabContents[TAB_LEXICON].querySelector('#entry-notes-count').textContent = `(${activeEntry.notes.length})`;
    for (let i = 0; i < activeEntry.notes.length; i++) renderNote(i);
};

// close open menu if user interacts with something else
// window.addEventListener('click', e => {

//     console.log(activeMenu);
//     let menuElem = document.querySelector(activeMenu);
//     if (!menuElem) {
//         console.log('Hanging pointer to active menu. Resetting.');
//         activeEntry = ''; // if menu is hanging pointer, clear it
//         return;
//     }
//     if (!menuElem.contains(e.target)) {
//         console.log('User interacted outside open menu. Closing menu...');
//         toggleMenu(e,activeMenu); // else toggle it (off)
//     }
    

//     // if (activeMenu !== undefined) {
//     //     const elem = document.getElementById(activeMenu);
//     //     if (!elem) {
//     //         // if previously-active element deleted, stop tracking it (ie wordform recently deleted)
//     //         activeMenu = undefined;
//     //         return;
//     //     }
//     //     if (!elem.contains(e.target)) {
//     //         elem.style.visibility = 'hidden';
//     //     }
//     // }
// });



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

const updateEditorHeader = () => {
    // interact with entry.L1[0], since eng guaranteed to only have 1 form
    Object.assign(tabContents[TAB_LEXICON].querySelector('#entry-L1'), {
        value : activeEntry.L1[0].join('; '),
        onblur : () => {
            activeEntry.L1[0] = tabContents[TAB_LEXICON].querySelector('#entry-L1').value.split(RE_SYNONYM_SPLITTER);
            console.log(activeEntry.L1[0]);
        }
    });
    tabContents[TAB_LEXICON].querySelector('#entry-catg').textContent = L2.catgs[activeEntry.catg];
};

const renderWordform = i => {
    let e = document.getElementById('tpl-entry-wordform').content.cloneNode(true);
    // form select
    e.querySelector('select').replaceWith( tplFormSelect.content.cloneNode(true) );
    Object.assign(e.querySelector('select'), {
        id : `entry-form-${i}-selector`,
        value : activeEntry.L2[i].formId ?? -1,
        onchange : () => {
            if (document.getElementById(`entry-form-${i}-selector`).value === '+') {
                console.log(`Add New Form, triggered by wordform ${i}`);
            } else {
                activeEntry.L2[i].formId = document.getElementById(`entry-form-${i}-selector`).value;
            }
        }
    });
    // word input
    Object.assign(e.querySelector('input'), {
        id : `entry-form-${i}-content`,
        value : activeEntry.L2[i].synonyms.join('; '),
        onblur : () => {
            activeEntry.L2[i].synonyms = document.getElementById(`entry-form-${i}-content`).value.split(RE_SYNONYM_SPLITTER);
            console.log(activeEntry.L2[i]);
        }
    });
    // menu
    e.querySelector('.options-menu').id = `entry-form-${i}-menu`;
    e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt,`#entry-form-${i}-menu`);
    e.querySelector('.options-menu > .menu-option-standard').onclick = () => console.log(`Trigger modal: manage audio for wordform ${i}`);
    e.querySelector('.options-menu > .menu-option-caution').onclick = () => console.log(`Trigger modal: delete wordform ${i}`);

    // events
    tabContents[TAB_LEXICON].querySelector('#entry-forms-wrapper').appendChild(e);
};
const renderSentence = i => {
    let e = document.getElementById('tpl-entry-sentence').content.cloneNode(true);
    // form select
    e.querySelector('select').replaceWith( tplFormSelect.content.cloneNode(true) );
    Object.assign(e.querySelector('select'), {
        id : `entry-sentence-${i}-selector`,
        value : activeEntry.sentences[i].formId ?? -1,
        onchange : () => {
            if (document.getElementById(`entry-sentence-${i}-selector`).value === '+') {
                console.log(`Add New Form, triggered by sentence ${i}`);
            } else {
                activeEntry.sentences[i].formId = document.getElementById(`entry-sentence-${i}-selector`).value;
            }
        }
    });
    // sentences
    Object.assign(e.querySelector('.entry-sentence-L1'), {
        id : `entry-sentence-${i}-L1`,
        value : activeEntry.sentences[i].L1,
        onblur : () => {
            activeEntry.sentences[i].L1 = document.getElementById(`entry-sentence-${i}-L1`).value;
            console.log(activeEntry.sentences[i]);
        }
    });
    Object.assign(e.querySelector('.entry-sentence-L2'), {
        id : `entry-sentence-${i}-L2`,
        value : activeEntry.sentences[i].L2,
        onblur : () => {
            activeEntry.sentences[i].L2 = document.getElementById(`entry-sentence-${i}-L2`).value;
            console.log(activeEntry.sentences[i]);
        }
    });
    // menu
    e.querySelector('.options-menu').id = `entry-sentence-${i}-menu`;
    e.querySelector('.icon-tridot').onclick = (evt) => toggleMenu(evt,`#entry-sentence-${i}-menu`);
    e.querySelector('.options-menu > .menu-option-standard').onclick = () => console.log(`Trigger modal: manage audio for sentence ${i}`);
    e.querySelector('.options-menu > .menu-option-caution').onclick = () => console.log(`Trigger modal: delete sentence ${i}`);

    tabContents[TAB_LEXICON].querySelector('#entry-sentences-wrapper').appendChild(e);
};
const renderNote = i => {
    let e = document.getElementById('tpl-entry-note').content.cloneNode(true);
    e.querySelector('p').textContent = `Note #${i+1}`;
    Object.assign(e.querySelector('textarea'), {
        id : `entry-note-${i}`,
        value : activeEntry.notes[i],
        onblur : () => {
            activeEntry.notes[i] = document.getElementById(`entry-note-${i}`).value;
            console.log(activeEntry.notes[i]);
        }
    });
    tabContents[TAB_LEXICON].querySelector('#entry-notes-wrapper').appendChild(e);
};

const toggleMenu = (evt,menuId) => {
    evt.stopPropagation(); // menu closes when user clicks outside it, so block that if user clicked explicit menu trigger
    
    // console.log(`Current menu is "${activeMenu}". Toggling menu "${menuId}"...`);
    
    if (!menuId) {
        // no menu targetted -> close active menu, if any
        if (activeMenu) {
            // console.log(`No menu targetted. Closing prev menu...`);
            tabContents[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
            activeMenu = undefined;
        } else {
            console.log(`No menu targetted. No open menues need closing.`);
        }
    } else if (menuId === activeMenu) {
        // this menu already open -> close it
        // console.log(`Menu already open. Toggling closed...`);
        tabContents[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
        activeMenu = undefined;
    } else {
        // diff menu already open -> close it
        if (activeMenu) {
            // console.log(`Closing menu "${activeMenu}"...`);
            tabContents[TAB_LEXICON].querySelector(activeMenu).style.visibility = 'hidden';
        }
        // open target menu
        // console.log(`Opening menu "${menuId}"...`);
        tabContents[TAB_LEXICON].querySelector(menuId).style.visibility = 'visible';
        activeMenu = menuId;
    }

    // clicked inside menu -> do nothing
    // clicked menu trigger
        // if this menu already open -> close it
        // if a diff menu open -> close that menu, then open this one
        // if no menu is open -> open this menu
    // clicked somewhere else -> close open menu, if any

};
window.addEventListener('click', e => {
    if (activeMenu && !tabContents[TAB_LEXICON].querySelector(activeMenu).contains(e.target)) {
        toggleMenu(e, undefined); // if a menu was open and we clicked something unrelated to menus, close it
    }
});



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