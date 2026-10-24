// The card pop-over: opens from a bold term or a map marker, shows CONTENT.cards[id].
import { photoBlock, swapForPlaceholderOnError } from './lesson.js';
import { markCardOpened } from './store.js';

const KIND_LABEL = { person: 'Личност', place: 'Място', object: 'Предмет', people: 'Народ', idea: 'Понятие', event: 'Събитие', state: 'Държава' };

// onOpen: the card's marker shows it was seen; onClose: the map drops its selected marker
export function createCards(popEl, { onOpen, onClose }) {
    const close = () => {
        popEl.hidden = true;
        onClose();
    };
    const open = (id) => {
        const card = CONTENT.cards[id];
        if (!card) return;
        popEl.innerHTML = cardHtml(card);
        popEl.hidden = false;
        popEl.scrollTop = 0;
        popEl.querySelectorAll('.ph img').forEach((img) => swapForPlaceholderOnError(img, card.kind));
        popEl.querySelector('.x').addEventListener('click', close);
        markCardOpened(id);
        onOpen(id);
    };
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.getElementById('lsBody').addEventListener('click', (e) => { if (!e.target.closest('b.term')) close(); });
    return { open, close };
}

function cardHtml(card) {
    const dates = card.dates ? `<div class="dates">${escapeHtml(card.dates)}</div>` : '';
    return `<div class="pic">${photoBlock(CONTENT.photos[card.photo], card.kind)}<button class="x" type="button" aria-label="Затвори">×</button></div>
        <div class="pb"><span class="kind">${KIND_LABEL[card.kind] ?? ''}</span><h3>${escapeHtml(card.title)}</h3>${dates}${card.html}</div>`;
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
