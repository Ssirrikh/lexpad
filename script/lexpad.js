
console.log(`Inline JS running successfully.`);

// DOM anchors
const eNavTabs = [
    document.getElementById('navtab-0'),
    document.getElementById('navtab-1'),
    document.getElementById('navtab-2')
];
const eContent = document.getElementById('r-content');
const eStatbarLeft = document.getElementById('statbar-left');

// tab switching
function loadTab (tabId) {
    console.log(`Load tab ${tabId}`);
    for (let i = 0; i < eNavTabs.length; i++) {
        if (i === tabId && !eNavTabs[i].classList.contains('active-navtab')) {
            eNavTabs[i].classList.add('active-navtab');
        } else if (i !== tabId && eNavTabs[i].classList.contains('active-navtab')) {
            eNavTabs[i].classList.remove('active-navtab');
        }
    }
}

// dynamic content
let eStr = ``;
for (let i = 0; i < 50; i++) {
    eStr += `<div class='flex-col r-list-item'>`;
        eStr += `<h2>Item ${i} Title</h2>`;
        eStr += `<p>Subtitle Goes Here</p>`;
    eStr += `</div>`;
}
eContent.innerHTML = eStr;

// attach event handlers
for (let i = 0; i < eNavTabs.length; i++) {
	eNavTabs[i].onclick = e => loadTab(i);
}
eStatbarLeft.onclick = e => window.electronAPI.flipToggle();