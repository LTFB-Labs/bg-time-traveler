// The card pop-over: opens from a bold term or a map marker and shows CONTENT.cards[id] as a postcard over the dimmed screen.
// The photo is on the left. The writing is on the right: a stamp with the card's kind, a round postmark with a small map of the card's
// place in its middle and the card's time around it, the title in handwriting and the text. The paper is a photo of old paper.
import { esc, photoCredit, swapForPlaceholderOnError } from '../lesson/lesson.js';
import { cardIcon, P } from '../../code/map/map.js';
import { windowAround } from '../../code/map/geo.js';
import { fmtSpan, fmtYear } from '../../code/timeline/years.js';
import { markCardOpened } from '../../code/store.js';

const KIND_LABEL = { person: 'Личност', place: 'Място', object: 'Предмет', people: 'Народ', idea: 'Понятие', event: 'Събитие', state: 'Държава' };
const GAME_NAME = 'Пътешествие във времето';

// the card's place on the game's map: in the postmark's middle (round, so as tall as it is wide), and large in the photo's place when
// the card has no photo; span: how many map units wide it is, aspect: its width over its height, the same as its box in lesson.css
const POSTMARK_MAP = { look: 'mini', span: 620, aspect: 1 };
const PHOTO_MAP = { look: 'atlas', span: 1100, aspect: 4 / 3, hasRivers: true };
// the postmark's ring: its text takes at most RING_LENGTH of the circle (the rest is a gap at the bottom), a letter is LETTER_WIDTH
// of the font size wide, and a short text keeps RING_FONT
const RING_LENGTH = 206;
const LETTER_WIDTH = .8;
const RING_FONT = 9;

const WAVES = '<svg class="waves" viewBox="0 0 96 44" aria-hidden="true"><path d="M0 6q6-5 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0M0 18q6-5 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0'
    + 'M0 30q6-5 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0M0 42q6-5 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0"/></svg>';

// onOpen: the card's marker shows it was seen; onClose: the map drops its selected marker; footer(id): HTML at the end of the card
export function createCards(popEl, { onOpen, onClose, footer = () => '' }) {
    const close = () => {
        popEl.hidden = true;
        onClose();
    };
    const open = (id) => {
        const card = CONTENT.cards[id];
        if (!card) return;
        popEl.innerHTML = postcardHtml(card, footer(id));
        popEl.hidden = false;
        popEl.classList.remove('moved');
        popEl.addEventListener('pointermove', () => popEl.classList.add('moved'), { once: true });
        popEl.querySelectorAll('.print img').forEach((img) => swapForPlaceholderOnError(img, card.kind));
        popEl.querySelector('.print')?.addEventListener('click', (e) => e.currentTarget.classList.toggle('big'));
        popEl.querySelector('.x').addEventListener('click', close);
        markCardOpened(id);
        onOpen(id);
    };
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    // a click on the dimmed screen around the postcard closes it
    popEl.addEventListener('click', (e) => { if (e.target === popEl) close(); });
    return { open, close };
}

function postcardHtml(card, footerHtml) {
    return `<div class="pc" role="dialog" aria-label="${esc(card.title)}">${photoSide(card)}
        <div class="tp">${postHtml(card)}<h3 style="--letters:${longestWord(card.title)}">${esc(card.title)}</h3><div class="body">${card.html}${footerHtml}</div></div>
        <button class="x" type="button" aria-label="Затвори">×</button></div>`;
}

// how many letters the title's longest word has: lesson.css shrinks the title until that word fits beside the postmark
export const longestWord = (title) => Math.max(...title.split(/\s+/).map((word) => word.length));

// the photo as a taped print with its caption and credit; with no photo, the card's place on the map, or the kind's icon when it has no place
function photoSide(card) {
    const photo = CONTENT.photos[card.photo];
    if (photo) {
        return `<div class="pp"><div class="print"><span class="tape"></span><img src="${esc(photo.f)}" alt=""></div>
            <div class="cap">${esc(photo.c ?? '')}</div><div class="cr">${photoCredit(photo)}</div></div>`;
    }
    const picture = card.at ? placeMap(card, PHOTO_MAP) : `<div class="emblem">${cardIcon(card.kind)}</div>`;
    return `<div class="pp">${picture}<div class="cap">${esc(card.title)}</div></div>`;
}

// the stamp shows the card's kind; the round postmark beside it shows the card's place in its middle and its time around it
function postHtml(card) {
    const middle = card.at ? placeMap(card, POSTMARK_MAP) : '<b>★</b>';
    return `<div class="post"><div class="stamp-w"><div class="stamp"><div class="sf">${cardIcon(card.kind)}<span>${KIND_LABEL[card.kind] ?? ''}</span></div></div></div>
        ${WAVES}<div class="pm">${ringSvg(postmarkText(card))}${middle}</div></div>`;
}

// the postmark's two rings, with the text running round between them, centred at the top
function ringSvg(text) {
    const size = Math.min(RING_FONT, RING_LENGTH / (text.length * LETTER_WIDTH));
    return '<svg viewBox="0 0 100 100"><defs><path id="pmRing" d="M50 88.5a38.5 38.5 0 0 1 0-77a38.5 38.5 0 0 1 0 77"/></defs>'
        + '<circle cx="50" cy="50" r="47"/><circle cx="50" cy="50" r="31"/>'
        + `<text style="font-size:${size.toFixed(1)}px"><textPath href="#pmRing" startOffset="50%" text-anchor="middle">${esc(text.toUpperCase())}</textPath></text></svg>`;
}

// the card's time for the postmark: its dates as written, else its years, else the game's name
export function postmarkText(card) {
    if (card.dates) return card.dates;
    if (!card.years) return GAME_NAME;
    const [from, to] = card.years.map(Math.floor);
    return from === to ? fmtYear({ year: from }) : fmtSpan([from, to]);
}

// the game's sea, coast, Danube and today's Bulgaria around the card's place, with a red seal on the place; lesson.css colours each look
function placeMap(card, view) {
    const { vb, at } = windowAround(P(...card.at), view, GEO);
    const spot = `left:${(at[0] * 100).toFixed(2)}%;top:${(at[1] * 100).toFixed(2)}%`;
    const tape = view.look === 'atlas' ? '<span class="tape"></span>' : '';
    return `<div class="${view.look}">${tape}<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" aria-hidden="true">${mapLayers(vb, view)}</svg>`
        + `<span class="seal" style="${spot}"></span></div>`;
}

function mapLayers(vb, { hasRivers }) {
    const rivers = hasRivers ? `<path class="riv" d="${GEO.rivers}"/>` : '';
    return `<rect class="sea" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}"/><path class="land" d="${GEO.land}"/>${rivers}`
        + `<path class="dan" d="${GEO.danube}"/><path class="now" d="${GEO.today.line}"/><path class="coast" d="${GEO.land}"/>`;
}
