// Entry point: builds the map, then routes by the address hash. Any hash change reloads the page.
// '#lessons' → the textbooks of the lesson hall; '#lessons/<textbook>' → its sections; '#lessons/<textbook>/<section>' → the section's lessons; '#quest' → the Quest; '#lesson/<id>' or '#lesson/<id>/<n>' → the lesson player; anything else → the start screen.
import { createMap } from '../code/map/map.js';
import { startQuest } from '../apps/quest/quest.js';
import { startLessonList } from './lesson/lesson-list.js';
import {
    startOptions,
    startTodayButtons,
} from './options/options.js';
import { loadProgress, setLast } from '../code/store.js';
import {
    showNoLesson,
    startLesson,
} from './lesson/lesson.js';

startOptions();
const map = createMap(document.getElementById('map'), document.getElementById('ov'));
startTodayButtons(map);
const route = location.hash.match(/^#lesson\/([^/]*)\/?(\d*)/);
// the pages over the map: the body class that hides the map's furniture, and what draws the page
const page = { '#lessons': ['lessons', startLessonList], '#quest': ['quest', startQuest] }[location.hash];
const hallFloor = location.hash.match(/^#lessons\/(.+)$/);
if (page) openPage(...page);
else if (hallFloor) openPage('lessons', () => startLessonList(hallFloor[1]));
else if (route) openLesson(route[1], route[2]);
else if (lastLesson()) {
    // a bare visit goes straight back into the last lesson, at the part the child reached; the lesson's back arrow leads out
    history.replaceState(null, '', `#lesson/${lastLesson()}`);
    openLesson(lastLesson(), '');
}
else openStart();
addEventListener('hashchange', () => location.reload());

function openPage(bodyClass, start) {
    document.body.classList.add(bodyClass);
    start();
}

// the start screen with the mascot; "Тръгваме!" (or Enter or space) goes on to the lesson hall
function openStart() {
    const go = () => { location.hash = '#lessons'; };
    document.getElementById('go').addEventListener('click', go);
    addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') go();
    });
}

// the last lesson, on a bare address only: "Към началото" (#) still shows the start screen
function lastLesson() {
    const { last } = loadProgress();
    return !location.href.includes('#') && last && Object.hasOwn(CONTENT.lessons, last) ? last : null;
}

function openLesson(id, part) {
    document.body.classList.add('lesson');
    if (!Object.hasOwn(CONTENT.lessons, id)) {
        showNoLesson();
        return;
    }
    setLast(id);
    const saved = loadProgress().position[id] ?? 0;
    startLesson(map, CONTENT.lessons[id], { part: part === '' ? saved : Number(part) });
}
