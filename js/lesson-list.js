// The lesson list at #lessons: the textbook's lessons grade by grade, in book order; a ready one opens, an unready one is greyed out, a passed one has a gold ring.
import { esc } from './lesson.js';
import { loadProgress } from './store.js';
import { fmtSpan } from './years.js';

// the grades the app is meant for; one without lessons in CONTENT.grades shows greyed out
const GRADES = ['5', '6', '7'];

// entries: one grade of CONTENT.grades, in index.json order; lessons: CONTENT.lessons; passed: the progress store's passed lessons
export function listRows(entries, { lessons, passed }) {
    return entries.map(({ id, number, title, span }) => ({
        number,
        title,
        date: span ? fmtSpan(span) : '',
        href: Object.hasOwn(lessons, id) ? `#lesson/${id}` : null,
        isPassed: Object.hasOwn(passed, id),
    }));
}

export function startLessonList() {
    const root = document.getElementById('lessonList');
    const tabs = root.querySelector('.grades');
    const open = GRADES.filter((grade) => CONTENT.grades[grade]?.length > 0);
    const show = (grade) => {
        tabs.innerHTML = GRADES.map((g) => tabHtml(g, open.includes(g), g === grade)).join('');
        const rows = listRows(CONTENT.grades[grade] ?? [], { lessons: CONTENT.lessons, passed: loadProgress().passed });
        root.querySelector('.rows').innerHTML = rows.map(rowHtml).join('');
    };
    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('button:enabled');
        if (tab) show(tab.dataset.grade);
    });
    root.hidden = false;
    show(open[0]);
}

function tabHtml(grade, isOpen, isActive) {
    const soon = isOpen ? '' : ' <small>скоро</small>';
    return `<button type="button" data-grade="${grade}" aria-pressed="${isActive}"${isOpen ? '' : ' disabled'}>${grade}. клас${soon}</button>`;
}

function rowHtml({ number, title, date, href, isPassed }) {
    const text = `<span class="num">${number}</span><span class="txt"><b>Урок ${number} · ${esc(title)}</b><small>${esc(href ? date : 'скоро')}</small></span>`;
    if (!href) return `<li><span class="row soon">${text}</span></li>`;
    const passed = isPassed ? '<span class="sr">, минат</span>' : '';
    return `<li><a class="row${isPassed ? ' passed' : ''}" href="${href}">${text}${passed}</a></li>`;
}
