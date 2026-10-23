// Entry point: builds the map, then routes by the address hash. Any hash change reloads the page.
// '' or '#free' → the free timeline; '#lesson/<id>' or '#lesson/<id>/<n>' → the lesson player.
import { createMap } from './map.js';
import { startFree } from './free.js';
import { loadProgress } from './store.js';
import {
    showNoLesson,
    startLesson,
} from './lesson.js';

const map = createMap(document.getElementById('map'), document.getElementById('ov'));
const route = location.hash.match(/^#lesson\/([^/]*)\/?(\d*)/);
if (route) openLesson(route[1], route[2]);
else startFree(map);
addEventListener('hashchange', () => location.reload());

function openLesson(id, part) {
    document.body.classList.add('lesson');
    if (!Object.hasOwn(CONTENT.lessons, id)) {
        showNoLesson();
        return;
    }
    const saved = loadProgress().position[id] ?? 0;
    startLesson(map, CONTENT.lessons[id], { part: part === '' ? saved : Number(part) });
}
