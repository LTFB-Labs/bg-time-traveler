// Entry point: builds the map, then routes by the address hash. Any hash change reloads the page.
import { createMap } from './map.js';
import { startFree } from './free.js';

const map = createMap(document.getElementById('map'), document.getElementById('ov'));
if (location.hash.startsWith('#lesson/')) {
    // placeholder until the lesson player lands (Task 4): lessons show the free timeline for now
    console.log('Lesson player not built yet, showing the free timeline for', location.hash);
}
startFree(map);
addEventListener('hashchange', () => location.reload());
