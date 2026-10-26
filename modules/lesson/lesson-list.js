// The lesson hall: #lessons shows the sections (CONTENT.quest.sections), #lessons/<section id> the lessons of one section over its
// picture; both are tall cards side by side, scrolled left and right.
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
        };
    });
    const made = mocks.map(({ grade, number, title, span, lead, chapters, photo }) => ({
        grade, number, title, date: fmtSpan(span), lead, chapters, photo: photos[photo]?.f ?? null, href: null, isPassed: false,
    }));
    return [...real, ...made];
}

// a section's lessons, in the section's order; a number with no card is left out
export function sectionLessons(section, cards) {
    return section.lessons.map((number) => cards.find((card) => card.grade === section.grade && card.number === number)).filter(Boolean);
}

// the grades the dropdown offers; '' is every grade
const GRADES = [5, 6, 7];

// sectionId: the section whose lessons to show; without it the hall shows the sections
export function startLessonList(sectionId) {
    const root = document.getElementById('lessonList');
    const shelf = root.querySelector('.shelf');
    const cards = hallCards({ grades: CONTENT.grades, lessons: CONTENT.lessons, photos: CONTENT.photos, passed: loadProgress().passed }, MOCK_LESSONS);
    const { sections } = CONTENT.quest;
    const section = sections.find((s) => s.id === sectionId);
    if (section) showSection(root, shelf, section, cards);
    else showSections(root, shelf, sections, cards);
    root.hidden = false;
    wireScroll(root, shelf);
}

// the sections, for now only their names; the dropdown picks a grade
function showSections(root, shelf, sections, cards) {
    const pick = root.querySelector('.grade');
    pick.innerHTML = ['<option value="">Всички класове</option>', ...GRADES.map((g) => `<option value="${g}">${g}. клас${sections.some((s) => s.grade === g) ? '' : ' (скоро)'}</option>`)].join('');
    const show = () => {
        const shown = sections.filter((s) => !pick.value || s.grade === Number(pick.value));
        shelf.innerHTML = shown.length ? shown.map((s) => sectionHtml(s, sectionLessons(s, cards).length)).join('') : '<li class="empty">За този клас още няма уроци.</li>';
        shelf.scrollLeft = 0;
        shelf.dispatchEvent(new Event('scroll'));
    };
    pick.addEventListener('change', show);
    show();
}

// one section's lessons over the section's picture; the way back leads to the sections
function showSection(root, shelf, section, cards) {
    const photo = CONTENT.photos[section.photo]?.f;
    // a full address: a relative url() inside the variable would be read against lesson.css, not the page
    if (photo) root.style.setProperty('--hall-bg', `url('${new URL(photo, location.href).href}')`);
    root.classList.add('in-section');
    root.querySelector('h1').textContent = section.title;
    root.querySelector('.grade').hidden = true;
    const back = root.querySelector('.back');
    back.href = '#lessons';
    back.lastChild.textContent = 'Към секциите';
    const lessons = sectionLessons(section, cards);
    shelf.innerHTML = lessons.length ? lessons.map(cardHtml).join('') : '<li class="empty">В тази секция още няма уроци.</li>';
}

function sectionHtml({ id, title }, count) {
    return `<li class="lcard section"><a class="face" href="#lessons/${esc(id)}"><b>${esc(title)}</b><span class="meta">${count} ${count === 1 ? 'урок' : 'урока'}</span></a></li>`;
}

function cardHtml({ number, title, date, lead, chapters, photo, href, isPassed }) {
    const art = photo ? ` style="background-image:url('${esc(photo)}')"` : '';
    const list = chapters.length ? `<div class="chapters"><h3>Глави</h3><ol>${chapters.map((c) => `<li>${esc(c)}</li>`).join('')}</ol></div>` : '';
    const badge = href ? (isPassed ? '<span class="chip badge done">Минат</span>' : '') : '<span class="chip badge">Скоро</span>';
    const body = `<header class="banner"><span class="chip y">Урок ${number}</span><b>${esc(title)}</b></header>
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
