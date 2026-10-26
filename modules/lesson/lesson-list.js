// The lesson hall, three floors deep: #lessons shows the textbooks, #lessons/<textbook> its sections as decks of cards lying on
// the table with the section's icon standing on top like a pawn, #lessons/<textbook>/<section> the section's lessons; each floor
// over its own picture, scrolled left and right. Textbooks and sections are CONTENT.quest.
// A card has the lesson's number and title, its summary photo as background, the lead as a short description and,
// on hover or focus, its chapters. A ready lesson opens; a mock one (mock-lessons.js) shows as "скоро".
import { esc } from './lesson.js';
import { MOCK_LESSONS } from './mock-lessons.js';
import { loadProgress } from '../../code/store.js';
import { fmtSpan } from '../../code/timeline/years.js';

// grades: CONTENT.grades; lessons: CONTENT.lessons; photos: CONTENT.photos; passed: the progress store's passed lessons
export function hallCards({ grades, lessons, photos, passed }, mocks = []) {
    const real = Object.keys(grades).sort((a, b) => a - b).flatMap((grade) => grades[grade].map((entry) => ({ grade: Number(grade), entry }))).map(({ grade, entry }) => {
        const lesson = lessons[entry.id];
        const summary = lesson?.parts.find((part) => part.type === 'summary');
        return {
            grade,
            number: entry.number,
            title: entry.title,
            date: entry.span ? fmtSpan(entry.span) : '',
            lead: summary?.meta.lead ?? '',
            chapters: lesson ? lesson.parts.filter((part) => part.type === 'story').map((part) => part.heading) : [],
            photo: photos[summary?.meta.photo]?.f ?? null,
            href: lesson ? `#lesson/${entry.id}` : null,
            isPassed: Object.hasOwn(passed, entry.id),
            icon: lesson?.icon ?? null,
        };
    });
    const made = mocks.map(({ grade, number, title, span, lead, chapters, photo, icon }) => ({
        grade, number, title, date: fmtSpan(span), lead, chapters, photo: photos[photo]?.f ?? null, href: null, isPassed: false, icon: icon ?? null,
    }));
    return [...real, ...made];
}

// a section's lessons, in the section's order; a number with no card is left out
export function sectionLessons(section, cards) {
    return section.lessons.map((number) => cards.find((card) => card.grade === section.grade && card.number === number)).filter(Boolean);
}

// the grades the dropdown offers; '' is every grade
const GRADES = [5, 6, 7];

// path: '' for the textbooks, '<textbook>' for its sections, '<textbook>/<section>' for the section's lessons
export function startLessonList(path = '') {
    const root = document.getElementById('lessonList');
    const shelf = root.querySelector('.shelf');
    const cards = hallCards({ grades: CONTENT.grades, lessons: CONTENT.lessons, photos: CONTENT.photos, passed: loadProgress().passed }, MOCK_LESSONS);
    const { textbooks, sections } = CONTENT.quest;
    const [bookId, sectionId] = path.split('/');
    const book = textbooks.find((b) => b.id === bookId);
    const section = book && sections.find((s) => s.id === sectionId && s.textbook === book.id);
    if (section) showSection(root, shelf, book, section, cards);
    else if (book) showBook(root, shelf, book, sections.filter((s) => s.textbook === book.id), cards);
    else showBooks(root, shelf, textbooks);
    root.hidden = false;
    wireScroll(root, shelf);
}

// a floor's title, its way back and its picture behind the cards
function setFloor(root, { title, back, backText, picture }) {
    root.querySelector('h1').textContent = title;
    const link = root.querySelector('.back');
    link.href = back;
    link.lastChild.textContent = backText;
    if (picture) {
        // a full address: a relative url() inside the variable would be read against lesson.css, not the page
        root.style.setProperty('--hall-bg', `url('${new URL(picture, location.href).href}')`);
        root.classList.add('in-section');
    }
}

// the textbooks; the dropdown picks a grade
function showBooks(root, shelf, textbooks) {
    setFloor(root, { title: 'Учебници', back: '#', backText: 'Към началото' });
    const pick = root.querySelector('.grade');
    pick.hidden = false;
    pick.innerHTML = ['<option value="">Всички класове</option>', ...GRADES.map((g) => `<option value="${g}">${g}. клас${textbooks.some((b) => b.grade === g) ? '' : ' (скоро)'}</option>`)].join('');
    const show = () => {
        const shown = textbooks.filter((b) => !pick.value || b.grade === Number(pick.value));
        shelf.innerHTML = shown.length ? shown.map(bookHtml).join('') : '<li class="empty">За този клас още няма учебник.</li>';
        shelf.scrollLeft = 0;
        shelf.dispatchEvent(new Event('scroll'));
    };
    pick.addEventListener('change', show);
    show();
}

// a textbook's sections, as decks of cards, over the textbook's background
function showBook(root, shelf, book, sections, cards) {
    setFloor(root, { title: book.title, back: '#lessons', backText: 'Към учебниците', picture: CONTENT.photos[book.background]?.f });
    root.querySelector('.grade').hidden = true;
    shelf.innerHTML = sections.length ? sections.map((s) => deckHtml(book, s, sectionLessons(s, cards).length)).join('') : '<li class="empty">В този учебник още няма секции.</li>';
}

// one section's lessons over the section's picture
function showSection(root, shelf, book, section, cards) {
    setFloor(root, { title: section.title, back: `#lessons/${book.id}`, backText: book.title, picture: CONTENT.photos[section.photo]?.f });
    root.querySelector('.grade').hidden = true;
    const lessons = sectionLessons(section, cards);
    shelf.innerHTML = lessons.length ? lessons.map(cardHtml).join('') : '<li class="empty">В тази секция още няма уроци.</li>';
}

// an icon drawn in the colour around it: the drawing in img/icons/ is a mask; a full address, as for the hall's picture
export const iconHtml = (icon, cls = 'icon') => (icon ? `<i class="${cls}" style="--icon:url('${new URL(`img/icons/${esc(icon)}.svg`, document.baseURI).href}')" aria-hidden="true"></i>` : '');

function bookHtml({ id, title, description, photo, icon }) {
    const picture = CONTENT.photos[photo]?.f;
    return `<li class="lcard book"><a class="face" href="#lessons/${esc(id)}">
        <header class="banner">${iconHtml(icon, 'icon badge-icon')}<b>${esc(title)}</b></header>
        <div class="art"${picture ? ` style="background-image:url('${esc(picture)}')"` : ''}></div>
        <footer><p>${esc(description)}</p><span class="go" aria-hidden="true">›</span></footer></a></li>`;
}

// a deck: one card per lesson lying on the table, the section's icon standing on it like a pawn
function deckHtml(book, { id, title, icon, color }, count) {
    const layers = Array.from({ length: Math.max(1, count) }, (_, i) => `<i class="layer" style="--i:${i}"></i>`).join('');
    return `<li class="lcard deck-slot" style="--c:${esc(color)};--n:${Math.max(1, count)}"><a class="face" href="#lessons/${esc(book.id)}/${esc(id)}">
        <span class="table"><span class="deck">${layers}<i class="top">${iconHtml(icon)}</i></span>
        <span class="pawn"><i class="head">${iconHtml(icon)}</i><i class="neck"></i><i class="foot"></i></span></span>
        <b class="name">${esc(title)}</b><span class="meta">${count} ${count === 1 ? 'урок' : 'урока'}</span></a></li>`;
}

function cardHtml({ number, title, date, lead, chapters, photo, href, isPassed, icon }) {
    const art = photo ? ` style="background-image:url('${esc(photo)}')"` : '';
    const list = chapters.length ? `<div class="chapters"><h3>Глави</h3><ol>${chapters.map((c) => `<li>${esc(c)}</li>`).join('')}</ol></div>` : '';
    const badge = href ? (isPassed ? '<span class="chip badge done">Минат</span>' : '') : '<span class="chip badge">Скоро</span>';
    const body = `<header class="banner">${iconHtml(icon, 'icon badge-icon')}<span class="chip y">Урок ${number}</span><b>${esc(title)}</b></header>
        <div class="art"${art}>${badge}${list}</div>
        <footer><p>${esc(lead)}</p><span class="meta">${esc(date)}${chapters.length ? ` · ${chapters.length} глави` : ''}</span>${href ? '<span class="go" aria-hidden="true">›</span>' : ''}</footer>`;
    const face = href ? `<a class="face" href="${href}">${body}</a>` : `<div class="face" aria-disabled="true">${body}</div>`;
    return `<li class="lcard${href ? '' : ' soon'}${isPassed ? ' passed' : ''}">${face}</li>`;
}

// arrows, the mouse wheel and dragging all scroll the shelf sideways; a drag does not count as a click
function wireScroll(root, shelf) {
    const step = () => shelf.querySelector('.lcard')?.getBoundingClientRect().width + 24 || 320;
    root.querySelector('.nav.prev').addEventListener('click', () => shelf.scrollBy({ left: -step(), behavior: 'smooth' }));
    root.querySelector('.nav.next').addEventListener('click', () => shelf.scrollBy({ left: step(), behavior: 'smooth' }));
    shelf.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        shelf.scrollBy({ left: e.deltaY });
    }, { passive: false });
    addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') shelf.scrollBy({ left: step(), behavior: 'smooth' });
        if (e.key === 'ArrowLeft') shelf.scrollBy({ left: -step(), behavior: 'smooth' });
    });
    let drag = null;
    shelf.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        drag = { x: e.clientX, left: shelf.scrollLeft, moved: false };
    });
    addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 6) { drag.moved = true; shelf.classList.add('dragging'); }
        if (drag.moved) shelf.scrollLeft = drag.left - dx;
    });
    addEventListener('pointerup', () => {
        if (drag?.moved) shelf.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true });
        drag = null;
        shelf.classList.remove('dragging');
    });
    const edges = () => {
        root.querySelector('.nav.prev').disabled = shelf.scrollLeft < 4;
        root.querySelector('.nav.next').disabled = shelf.scrollLeft + shelf.clientWidth > shelf.scrollWidth - 4;
    };
    shelf.addEventListener('scroll', edges, { passive: true });
    edges();
}
