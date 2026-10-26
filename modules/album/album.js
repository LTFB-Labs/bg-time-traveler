// The album at #album: every card the child has opened, one group per lesson, with what is left; a tile opens the card.
import { createCards } from '../cards/cards.js';
import { esc } from '../lesson/lesson.js';
import { cardIcon } from '../../code/map/map.js';
import { loadProgress } from '../../code/store.js';

const LESSON_EMPTY = 'Отвори картичка в урока и тя ще дойде тук.';
const CARD_LINK = /data-card="([^"]+)"/g;

// lessons: CONTENT.lessons in book order; opened: the card ids in the progress store
export function albumGroups({ lessons, opened }) {
    const isOpened = new Set(opened);
    const group = (name, ids, what, empty) => {
        const found = ids.filter((id) => isOpened.has(id));
        return { name, ids: found, count: `${found.length} от ${ids.length} ${what}`, empty };
    };
    return [
        ...lessons.map((lesson) => group(`Урок ${lesson.number} · ${lesson.title}`, lessonCards(lesson), 'картички от този урок', LESSON_EMPTY)),
    ];
}

// the cards a lesson marks on its map or links from its text, in order of first appearance
function lessonCards(lesson) {
    const ids = lesson.parts.flatMap((part) => [...(part.meta.marks ?? []), ...linkedCards(part.html), ...linkedCards(part.factHtml)]);
    return [...new Set(ids)];
}

const linkedCards = (html) => [...(html ?? '').matchAll(CARD_LINK)].map((match) => match[1]);

export function startAlbum() {
    const root = document.getElementById('album');
    const groups = albumGroups({ lessons: Object.values(CONTENT.lessons), opened: loadProgress().cards });
    root.querySelector('.groups').innerHTML = groups.map(groupHtml).join('');
    // the card pop-over, placed above the album by modules/lesson/lesson.css
    const cards = createCards(document.getElementById('freePop'), { onOpen: () => {}, onClose: () => {}, footer: showOnMap });
    root.addEventListener('click', (e) => {
        const tile = e.target.closest('.tile');
        if (tile) cards.open(tile.dataset.id);
        else cards.close();
    });
    root.hidden = false;
}

function groupHtml({ name, ids, count, empty }) {
    const body = ids.length > 0 ? `<div class="tiles">${ids.map(tileHtml).join('')}</div>` : `<p class="empty">${empty}</p>`;
    return `<section class="group"><h3>${esc(name)}</h3><p class="count">${count}</p>${body}</section>`;
}

function tileHtml(id) {
    const card = CONTENT.cards[id];
    const photo = CONTENT.photos[card.photo];
    const picture = photo ? `<img src="${esc(photo.f)}" alt="" loading="lazy">` : cardIcon(card.legacyKind ?? card.kind);
    return `<button class="tile" type="button" data-id="${esc(id)}"><span class="thumb">${picture}</span><span class="name">${esc(card.title)}</span></button>`;
}

// a card shows at the lesson part where it first appears; a card without one gets no button
function showOnMap(id) {
    const href = partHref(id);
    return href ? `<a class="btn pri" href="${esc(href)}">Покажи на картата</a>` : '';
}

function partHref(id) {
    const entry = CONTENT.search.find((e) => e.type === 'card' && e.id === id);
    return entry?.lesson ? `#lesson/${entry.lesson}/${entry.part}` : null;
}
