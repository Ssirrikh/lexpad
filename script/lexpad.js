
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
    let eStr = ``;
    eStr += `<div id='project-lang-info' class='flex-col'>`;
        eStr += `<label id='label-lang-name' for='lang-name'>Language Full Name</label>`;
        eStr += `<input id='lang-name' type='text'>`;
        eStr += `<label id='label-lang-abbr' for='lang-abbr'>Abbreviation</label>`;
        eStr += `<input id='lang-abbr' type='text'>`;
        eStr += `<label id='label-lang-alph' for='lang-alph'>Alphabet</label>`;
        eStr += `<input id='lang-alph' type='text'>`;
        eStr += `<div class='separator-line'></div>`;
        eStr += `<p id='wip-stats'>Project Statistics section coming soon.</p>`;
    eStr += `</div>`;
    e.innerHTML = eStr;
    tabContents[TAB_PROJECT] = e;
})();
(() => {
    let e = document.createElement('div');
        e.id = 'r-content';
    let eStr = ``;
    eStr += `<div id='project-lexicon' class='flex-col'>`;
        eStr += `<h1>Lexicon under construction...</h1>`;
    eStr += `</div>`;
    e.innerHTML = eStr;
    tabContents[TAB_LEXICON] = e;
})();

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
    await tryGetLangInfo();
    // TODO: refresh project tab
};
const tryGetLangInfo = async () => {
    const res = await window.electronAPI.getLangInfo();
    console.log(res);
    if (res.error) { console.error(res.message); return; }
    // save data in renderer context, then refresh project tab
    L2 = res.L2;
    buildProjectTab();
};



// Project Tab

const buildWelcomePage = () => {
    // open project / new project dialogue
    let eStr = ``;
    eStr += `<div id='welcome' class='flex-col'>`;
        eStr += `<h1>Welcome to LexPad</h1>`;
        eStr += `<div class='flex-row'>`;
            eStr += `<button id='btn-open-project' class='button-highlight'>Open Project</button>`;
            eStr += `<button id='btn-new-project' class='button-highlight'>New Project</button>`;
        eStr += `</div>`;
    eStr += `</div>`;
    eContent.innerHTML = eStr; // self-contained and uneditable; guaranteed safe
    // attach onclick events
    document.getElementById('btn-open-project').onclick = tryOpenProject;
};
const buildProjectTab = () => {
    if (!project.path) {
        buildWelcomePage();
    } else {
        // project status page
    }
};



// Lexicon Tab

//



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