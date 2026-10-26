// Entry point: builds the map, then routes by the address hash. Any hash change reloads the page.
// '' or '#free' → the free timeline; '#free/<event id>' → the free timeline on that event; '#lessons' → the lesson list; '#album' → the album; '#lesson/<id>' or '#lesson/<id>/<n>' → the lesson player.
import { createMap } from './map.js';
import { startAlbum } from './album.js';
import { startFree } from './free.js';
import { startLessonList } from './lesson-list.js';
import { startOptions } from './options.js';
import { loadProgress } from './store.js';
import {
    showNoLesson,
    startLesson,
} from './lesson.js';

startOptions();
const map = createMap(document.getElementById('map'), document.getElementById('ov'));
const route = location.hash.match(/^#lesson\/([^/]*)\/?(\d*)/);
const freeRoute = location.hash.match(/^#free\/(.+)$/);
// the pages over the map: the body class that hides the free map's furniture, and what draws the page
const page = { '#lessons': ['lessons', startLessonList], '#album': ['album', startAlbum] }[location.hash];
if (page) openPage(...page);
else if (route) openLesson(route[1], route[2]);
else startFree(map, { event: freeRoute?.[1] });
addEventListener('hashchange', () => location.reload());

function openPage(bodyClass, start) {
    document.body.classList.add(bodyClass);
    start();
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
