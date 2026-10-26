// The free map's search box: as the child types, the list under it shows what search found, group by group; a pick goes to onPick.
import { esc } from '../lesson/lesson.js';
import { MIN_QUERY } from '../../code/search.js';

const NOTHING = 'Нищо не намерих.';

// find(query) returns the groups of js/search.js; onPick(item) gets the picked entry
export function startSearch(root, { find, onPick }) {
    const box = root.querySelector('input');
    const list = root.querySelector('[role=listbox]');
    let items = [];
    let active = -1;

    const setOpen = (isOpen) => {
        list.hidden = !isOpen;
        box.setAttribute('aria-expanded', String(isOpen));
    };
    const show = () => {
        if (box.value.trim().length < MIN_QUERY) {
            setOpen(false);
            return;
        }
        const groups = find(box.value);
        items = groups.flatMap((group) => group.items);
        list.innerHTML = listHtml(groups);
        highlight(-1);
        setOpen(true);
    };
    const highlight = (k) => {
        active = k;
        list.querySelectorAll('[role=option]').forEach((row, i) => row.setAttribute('aria-selected', String(i === k)));
        if (k < 0) {
            box.removeAttribute('aria-activedescendant');
            return;
        }
        box.setAttribute('aria-activedescendant', `find-${k}`);
        document.getElementById(`find-${k}`).scrollIntoView({ block: 'nearest' });
    };
    // the box is left, so the arrow keys move the timeline again
    const pick = (k) => {
        setOpen(false);
        box.blur();
        onPick(items[k]);
    };
    const onKey = (e) => {
        const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
        if (step && items.length > 0 && !list.hidden) {
            e.preventDefault();
            highlight(nextRow(active, step, items.length));
        }
        if (e.key === 'Enter' && items.length > 0 && !list.hidden) {
            e.preventDefault();
            pick(Math.max(active, 0));
        }
        if (e.key === 'Escape') {
            // a search field would also clear its text; the first Escape only closes the list
            e.preventDefault();
            if (list.hidden) box.blur();
            setOpen(false);
        }
    };

    box.addEventListener('input', show);
    box.addEventListener('focus', show);
    box.addEventListener('keydown', onKey);
    list.addEventListener('click', (e) => {
        const row = e.target.closest('[role=option]');
        if (row) pick(Number(row.dataset.k));
    });
    document.addEventListener('pointerdown', (e) => { if (!root.contains(e.target)) setOpen(false); }, true);
}

function nextRow(active, step, count) {
    if (active < 0) return step > 0 ? 0 : count - 1;
    return (active + step + count) % count;
}

function listHtml(groups) {
    if (groups.length === 0) return `<li class="none">${NOTHING}</li>`;
    let k = -1;
    const row = (item) => {
        k += 1;
        return `<li role="option" id="find-${k}" data-k="${k}" aria-selected="false"><span>${esc(item.title)}</span><span>${esc(item.date ?? '')}</span></li>`;
    };
    return groups.map((group) => `<li class="grp" role="presentation">${esc(group.name)}</li>${group.items.map(row).join('')}`).join('');
}
