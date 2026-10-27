// The options menu: the look of the map's markers, a small wax seal or a shield with a name ribbon, kept with the progress; and delete progress.
// The developer tab holds the blur on the lesson map's edges: on or off, and its size. The tabs are radios; the CSS shows the chosen pane.
// The menu is a native popover; the gear buttons open it and a click outside or Escape closes it.
// Beside it, the "Граници днес" buttons, also kept with the progress.
import { icon } from '../../code/map/map.js';
import {
    loadProgress,
    resetProgress,
    setBlur,
    setPins,
    setToday,
} from '../../code/store.js';

export function startOptions() {
    const menu = document.getElementById('options');
    menu.querySelectorAll('.pv .mk').forEach((mk) => { mk.innerHTML = icon('building'); });
    const { pins } = loadProgress();
    menu.querySelector(`input[value="${pins}"]`).checked = true;
    showPins(pins);
    menu.addEventListener('change', (e) => {
        if (e.target.name !== 'pins') return;
        setPins(e.target.value);
        showPins(e.target.value);
    });
    startReset(menu, document.getElementById('reset'));
    startBlur(menu);
}

// the blur layer is #lsFog; off hides it, the size goes into its --blur (modules/lesson/lesson.css)
function startBlur(menu) {
    const fog = document.getElementById('lsFog');
    const isOn = menu.querySelector('#blurOn');
    const px = menu.querySelector('#blurPx');
    const show = () => {
        fog.hidden = !isOn.checked;
        fog.style.setProperty('--blur', `${px.value}px`);
        menu.querySelector('#blurOut').value = px.value;
    };
    const { blur } = loadProgress();
    isOn.checked = blur.on;
    px.value = blur.px;
    show();
    menu.addEventListener('input', (e) => {
        if (e.target !== isOn && e.target !== px) return;
        setBlur({ on: isOn.checked, px: Number(px.value) });
        show();
    });
}

// no browser dialog: the first click asks on the button itself, the second deletes and reloads, so every screen reads the empty progress
function startReset(menu, button) {
    const ask = (isAsking) => {
        button.classList.toggle('sure', isAsking);
        button.textContent = isAsking ? 'Сигурен ли си?' : 'Изтрий напредъка';
    };
    button.addEventListener('click', (e) => {
        // the second click of a double-click is not an answer; a keyboard press counts 0
        if (e.detail > 1) return;
        if (!button.classList.contains('sure')) {
            ask(true);
            return;
        }
        resetProgress();
        // a lesson address names its part; without it the reloaded lesson opens at its start, as the empty progress says
        history.replaceState(null, '', location.hash.replace(/^(#lesson\/[^/]*)\/\d+$/, '$1'));
        location.reload();
    });
    menu.addEventListener('toggle', (e) => { if (e.newState === 'closed') ask(false); });
}

function showPins(look) {
    document.getElementById('ov').dataset.pins = look;
}

// the "?" button left of the gear shows and hides today's Bulgaria in a lesson
export function startTodayButtons(map) {
    const buttons = document.querySelectorAll('.today-btn');
    const show = (isShown) => {
        map.showToday(isShown);
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(isShown)));
    };
    show(loadProgress().today);
    buttons.forEach((b) => b.addEventListener('click', () => {
        const isShown = b.getAttribute('aria-pressed') !== 'true';
        setToday(isShown);
        show(isShown);
    }));
}
