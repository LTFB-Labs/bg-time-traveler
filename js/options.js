// The options menu: the look of the map's markers, a small wax seal or a shield with a name ribbon, kept with the progress.
// The menu is a native popover; the gear buttons open it and a click outside or Escape closes it.
import { icon } from './map.js';
import {
    loadProgress,
    setPins,
} from './store.js';

export function startOptions() {
    const menu = document.getElementById('options');
    menu.querySelectorAll('.pv .mk').forEach((mk) => { mk.innerHTML = icon('building'); });
    const { pins } = loadProgress();
    menu.querySelector(`input[value="${pins}"]`).checked = true;
    showPins(pins);
    menu.addEventListener('change', (e) => {
        setPins(e.target.value);
        showPins(e.target.value);
    });
}

function showPins(look) {
    document.getElementById('ov').dataset.pins = look;
}
