// Entry point: builds the map, then routes by the address hash. Any hash change reloads the page.
// '#lessons' → the lesson list; '#album' → the album; '#quest' → the Quest; '#lesson/<id>' or '#lesson/<id>/<n>' → the lesson player; anything else → the start screen.
import { createMap } from '../code/map/map.js';
import { startAlbum } from './album/album.js';
import { startQuest } from '../apps/quest/quest.js';
import { startLessonList } from './lesson/lesson-list.js';
import {
    startOptions,
    startTodayButtons,
} from './options/options.js';
import { loadProgress } from '../code/store.js';
import {
    showNoLesson,
    startLesson,
} from './lesson/lesson.js';

startOptions();
const map = createMap(document.getElementById('map'), document.getElementById('ov'));
startTodayButtons(map);
const route = location.hash.match(/^#lesson\/([^/]*)\/?(\d*)/);
// the pages over the map: the body class that hides the map's furniture, and what draws the page
const page = { '#lessons': ['lessons', startLessonList], '#album': ['album', startAlbum], '#quest': ['quest', startQuest] }[location.hash];
if (page) openPage(...page);
else if (route) openLesson(route[1], route[2]);
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

function openLesson(id, part) {
    document.body.classList.add('lesson');
    if (!Object.hasOwn(CONTENT.lessons, id)) {
        showNoLesson();
        return;
    }
    const saved = loadProgress().position[id] ?? 0;
    startLesson(map, CONTENT.lessons[id], { part: part === '' ? saved : Number(part) });
}
