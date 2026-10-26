// The lesson hall at #lessons: one tall card per lesson, side by side, scrolled left and right (no grade picker for now).
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

// the grades the dropdown offers; '' is every grade
const GRADES = [5, 6, 7];

export function startLessonList() {
    const root = document.getElementById('lessonList');
    const shelf = root.querySelector('.shelf');
    const pick = root.querySelector('.grade');
    const cards = hallCards({ grades: CONTENT.grades, lessons: CONTENT.lessons, photos: CONTENT.photos, passed: loadProgress().passed }, MOCK_LESSONS);
    pick.innerHTML = ['<option value="">Всички класове</option>', ...GRADES.map((g) => `<option value="${g}">${g}. клас${cards.some((c) => c.grade === g) ? '' : ' (скоро)'}</option>`)].join('');
    const show = () => {
        const shown = cards.filter((c) => !pick.value || c.grade === Number(pick.value));
        shelf.innerHTML = shown.length ? shown.map(cardHtml).join('') : '<li class="empty">За този клас още няма уроци.</li>';
        shelf.scrollLeft = 0;
        shelf.dispatchEvent(new Event('scroll'));
    };
    pick.addEventListener('change', show);
    show();
    root.hidden = false;
    wireScroll(root, shelf);
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
