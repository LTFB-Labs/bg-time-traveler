import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { buildContent, renderContentJs } from '../build-content.mjs';

const root = join(import.meta.dirname, 'fixtures/content-ok');
const badRoot = join(import.meta.dirname, 'fixtures/content-bad');

test('buildsCompatibilityGlobals', () => {
    const { content, problems } = buildContent(root);
    assert.deepEqual(problems, []);
    assert.equal(content.cards.teres.title, 'Терес I');
    assert.equal(content.cards.teres.file, undefined);
    assert.match(content.cards.teres.html, /^<p>Терес е първият .*<\/p>\n<p>Знаеш ли/);
    assert.ok(content.search.some((entry) => entry.type === 'card'));
    const text = renderContentJs(content);
    assert.match(text, /const EVENTS = \[/);
    assert.match(text, /"START":600/);
    assert.match(text, /const CONTENT = \{/);
});

test('reportsCardProblems', () => {
    const { problems } = buildContent(badRoot);
    assert.deepEqual(problems.map((p) => p.file), ['information/teres/info.md', 'lessons/5/test-lesson.md']);
});

test('buildsLessonWithLinkedTerms', () => {
    const { content, problems } = buildContent(root);
    assert.deepEqual(problems, []);
    const lesson = content.lessons['5-test'];
    const firstStory = lesson.parts.find((part) => part.type === 'story');
    assert.match(firstStory.html, /<b class="term" data-card="teres">Терес<\/b>/);
    assert.equal(lesson.file, undefined);
    const entry = { id: '5-test', state: 'ready', title: 'Тестов урок', number: 1, span: [-500, -300], map: 'balkans' };
    assert.deepEqual(content.grades['5'], [entry]);
    assert.equal(content.grades['5'][0].file, undefined);
    assert.ok(content.search.some((entry) => entry.type === 'part' && entry.lesson === '5-test'));
});

test('reportsIndexIdThatDiffersFromLesson', () => {
    const copy = mkdtempSync(join(tmpdir(), 'content-'));
    cpSync(root, copy, { recursive: true });
    writeFileSync(join(copy, 'learning-materials/lessons/5/index.json'), '[{ "id": "5-other", "file": "test-lesson.md", "state": "ready" }]');
    const { problems } = buildContent(copy);
    assert.equal(problems.length, 1);
    assert.match(problems[0].message, /5-other/);
});

test('passesUnreadyLessonToThePage', () => {
    const index = '[{ "number": 1, "title": "Какво е история" }, { "id": "5-test", "file": "test-lesson.md", "state": "ready" }]';
    const { content, problems } = buildContent(copyOkWith({ 'learning-materials/lessons/5/index.json': index }));
    assert.deepEqual(problems, []);
    assert.deepEqual(content.grades['5'][0], { number: 1, title: 'Какво е история' });
    assert.equal(content.grades['5'][1].id, '5-test');
});

test('reportsUnreadyLessonWithoutNumberOrTitle', () => {
    const index = '[{ "title": "Без номер" }, { "number": 2 }, { "id": "5-test", "file": "test-lesson.md", "state": "ready" }]';
    const { problems } = buildContent(copyOkWith({ 'learning-materials/lessons/5/index.json': index }));
    assert.deepEqual(problems.map((p) => p.file), ['lessons/5/index.json', 'lessons/5/index.json']);
    assert.match(problems[0].message, /number and a title/);
});

test('cliExitsOnError', () => {
    const run = spawnSync(process.execPath, ['build-content.mjs', '--root', 'test/fixtures/content-bad'], { cwd: join(import.meta.dirname, '..'), encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /no-such-photo/);
    assert.match(run.stderr, /no-such-border/);
});

test('readsCardWithBomAndCrlf', () => {
    const card = readFileSync(join(root, 'learning-materials/information/teres/info.md'), 'utf8');
    const { content, problems } = buildContent(copyOkWith({ 'learning-materials/information/teres/info.md': '\uFEFF' + card.replaceAll('\n', '\r\n') }));
    assert.deepEqual(problems, []);
    assert.deepEqual(content.cards.teres, buildContent(root).content.cards.teres);
});

test('readsLessonWithCrlf', () => {
    const lesson = readFileSync(join(root, 'learning-materials/lessons/5/test-lesson.md'), 'utf8');
    const { content, problems } = buildContent(copyOkWith({ 'learning-materials/lessons/5/test-lesson.md': lesson.replaceAll('\n', '\r\n') }));
    assert.deepEqual(problems, []);
    assert.deepEqual(content.lessons['5-test'], buildContent(root).content.lessons['5-test']);
});

const CARD = 'learning-materials/information/teres/info.md';

test('reportsBadPhotoEntries', () => {
    const card = readFileSync(join(root, CARD), 'utf8');
    const cases = [
        [card.replace('file: images/teres-mask.jpg', 'file: images/Teres-Mask.jpg'), /images\/Teres-Mask\.jpg is listed in media but missing/],
        [card.replace('license: CC0', 'license: CC BY-NC 4.0'), /licence "CC BY-NC 4\.0"/],
        [card.replace('      license: CC0\n', ''), /must have required property 'license'/],
    ];
    for (const [text, expected] of cases) {
        const { problems } = buildContent(copyOkWith({ [CARD]: text }));
        assert.ok(problems.length > 0);
        assert.ok(problems.every((p) => p.file === 'information/teres/info.md'), JSON.stringify(problems));
        assert.ok(problems.some((p) => expected.test(p.message)), JSON.stringify(problems));
    }
});

test('reportsUnlistedMediaAndBrokenRelated', () => {
    const card = readFileSync(join(root, CARD), 'utf8').replace('aliases:', 'related: [ no-such-info ]\naliases:');
    const { problems } = buildContent(copyOkWith({ [CARD]: card, 'learning-materials/information/teres/audio/extra.mp3': 'x' }));
    assert.deepEqual(problems.map((p) => p.message).sort(), ['audio/extra.mp3 is in the package but not listed in media', 'related "no-such-info" is not an info package']);
});

test('reportsFieldsOutsideTheContract', () => {
    const card = readFileSync(join(root, CARD), 'utf8').replace('kind: person', 'kind: person\ncolour: red');
    const { problems } = buildContent(copyOkWith({ [CARD]: card }));
    assert.equal(problems.length, 1);
    assert.match(problems[0].message, /must NOT have additional properties "colour"/);
});

test('checksThatEveryQuestionIsAnsweredByItsText', () => {
    const question = (answer, quote, wrong = '[Ситалк, Котис]') => `questions:\n  - q: Кой?\n    answer: ${answer}\n    wrong: ${wrong}\n    quote: "${quote}"\naliases:`;
    const build = (answer, quote, wrong) => buildContent(copyOkWith({ [CARD]: readFileSync(join(root, CARD), 'utf8').replace('aliases:', question(answer, quote, wrong)) }));
    const good = build('Терес', 'Терес е първият');
    assert.deepEqual(good.problems, []);
    assert.equal(good.content.cards.teres.questions[0].answer, 'Терес');
    assert.deepEqual(build('Терес', 'Терес е последният').problems.map((p) => p.message), ['question 1: its quote is not in the text']);
    assert.deepEqual(build('Ситалк', 'Терес е първият', '[Терес, Котис]').problems.map((p) => p.message), ['question 1: its answer is not in its quote']);
    assert.deepEqual(build('Терес', 'Терес е първият', '[терес, Котис]').problems.map((p) => p.message), ['question 1: a wrong answer is the right one']);
});

test('readsTextbooksAndSectionsAndReportsBadOnes', () => {
    const icons = { 'learning-materials/icons.json': JSON.stringify({ crown: { a: 'Lorc', l: 'CC BY 3.0', u: 'https://game-icons.net' } }), 'img/icons/crown.svg': '<svg/>' };
    const book = JSON.stringify([{ id: 'history-5', title: 'История 5. клас', description: 'Учебник.', photo: 'teres-mask', background: 'teres-mask', icon: 'crown', grade: 5 }]);
    const section = (extra) => JSON.stringify([{ id: 'thracians', textbook: 'history-5', title: 'Траките', description: 'Царете.', photo: 'teres-mask', icon: 'crown', color: '#8a5a2b', grade: 5, lessons: [26], ...extra }]);
    const build = (extra) => buildContent(copyOkWith({ ...icons, 'learning-materials/quest/textbooks.json': book, 'learning-materials/quest/sections.json': section(extra) }));
    const good = build({});
    assert.deepEqual(good.problems, []);
    assert.equal(good.content.quest.textbooks[0].title, 'История 5. клас');
    assert.equal(good.content.quest.sections[0].title, 'Траките');
    assert.deepEqual(build({ textbook: 'nope', photo: 'nope', icon: 'sword', lessons: [] }).problems.map((p) => p.message), [
        'section 1: textbook "nope" is not in quest/textbooks.json',
        'section 1: photo "nope" is not a photo of an info package',
        'section 1: icon "sword" is not in icons.json with a drawing in img/icons/',
        'section 1: needs lesson numbers',
    ]);
    assert.deepEqual(buildContent(root).content.quest, { textbooks: [], sections: [] });
});

test('reportsUnlistedLessonsAndGradeWithoutIndex', () => {
    const { content, problems } = buildContent(copyOkWith({ 'learning-materials/lessons/5/draft.md': 'чернова', 'learning-materials/lessons/6/first.md': 'чернова' }));
    assert.deepEqual(problems.map((p) => p.file), ['lessons/5/draft.md', 'lessons/6/index.json', 'lessons/6/first.md']);
    assert.match(problems[0].message, /not listed in lessons\/5\/index\.json/);
    assert.match(problems[1].message, /missing/);
    assert.deepEqual(Object.keys(content.lessons), ['5-test']);
});

test('reportsUnreadableJsonByFileName', () => {
    const { problems } = buildContent(copyOkWith({ 'learning-materials/maps/balkans.json': '{ "START": 600 "END": 2026 }' }));
    assert.equal(problems[0].file, 'maps/balkans.json');
    assert.match(problems[0].message, /cannot read: .*JSON/);
});

function copyOkWith(files) {
    const copy = mkdtempSync(join(tmpdir(), 'content-'));
    cpSync(root, copy, { recursive: true });
    for (const [path, text] of Object.entries(files)) {
        mkdirSync(dirname(join(copy, path)), { recursive: true });
        writeFileSync(join(copy, path), text);
    }
    return copy;
}
