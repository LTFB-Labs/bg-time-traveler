// The hall's and the Quest's structure: textbooks (learning-materials/quest/textbooks.json) hold sections
// (learning-materials/quest/sections.json), sections hold lessons by number. A textbook is
// { id, title, description, photo, background, icon, grade }; a section is { id, textbook, title, description, photo, icon, color,
// grade, lessons }, a stretch of the Quest's road in its own colour that ends with a boss. Pictures are photo ids of info packages,
// icons are ids in learning-materials/icons.json with a drawing in img/icons/; a lesson number may name a lesson not written yet.
import { problem } from './problems.mjs';

const FILE = 'quest/sections.json';
const isId = (id) => typeof id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id);
const isText = (text) => typeof text === 'string' && text.trim() !== '';

// photos and icons: sets of the photo ids and icon ids there are
export function textbookProblems(textbooks, { photos, icons }) {
    if (!Array.isArray(textbooks)) return [problem('quest/textbooks.json', 'must be a list of textbooks')];
    const seen = new Set();
    return textbooks.flatMap((book, i) => {
        const { id, title, description, photo, background, icon, grade } = book ?? {};
        const messages = [
            ...(isId(id) ? [] : ['needs an id like "history-5"']),
            ...(seen.has(id) ? [`id "${id}" is used twice`] : []),
            ...(isText(title) ? [] : ['needs a title']),
            ...(isText(description) ? [] : ['needs a description']),
            ...(photos.has(photo) ? [] : [`photo "${photo}" is not a photo of an info package`]),
            ...(icons.has(icon) ? [] : [`icon "${icon}" is not in icons.json with a drawing in img/icons/`]),
            ...(photos.has(background) ? [] : [`background "${background}" is not a photo of an info package`]),
            ...(icons.has(icon) ? [] : [`icon "${icon}" is not in icons.json with a drawing in img/icons/`]),
            ...(Number.isInteger(grade) ? [] : ['needs a grade']),
        ];
        seen.add(id);
        return messages.map((message) => problem('quest/textbooks.json', `textbook ${i + 1}: ${message}`));
    });
}

// textbooks: the ids of the textbooks there are
export function sectionProblems(sections, { photos, icons, textbooks }) {
    if (!Array.isArray(sections)) return [problem(FILE, 'must be a list of sections')];
    const seen = new Set();
    return sections.flatMap((section, i) => {
        const { id, textbook, title, description, photo, icon, color, grade, lessons } = section ?? {};
        const messages = [
            ...(isId(id) ? [] : ['needs an id like "first-kingdom"']),
            ...(textbooks.has(textbook) ? [] : [`textbook "${textbook}" is not in quest/textbooks.json`]),
            ...(seen.has(id) ? [`id "${id}" is used twice`] : []),
            ...(typeof title === 'string' && title.trim() ? [] : ['needs a title']),
            ...(typeof description === 'string' && description.trim() ? [] : ['needs a description']),
            ...(photos.has(photo) ? [] : [`photo "${photo}" is not a photo of an info package`]),
            ...(icons.has(icon) ? [] : [`icon "${icon}" is not in icons.json with a drawing in img/icons/`]),
            ...(typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? [] : ['needs a colour like "#7a1e12"']),
            ...(Number.isInteger(grade) ? [] : ['needs a grade']),
            ...(Array.isArray(lessons) && lessons.length > 0 && lessons.every(Number.isInteger) ? [] : ['needs lesson numbers']),
        ];
        seen.add(id);
        return messages.map((message) => problem(FILE, `section ${i + 1}: ${message}`));
    });
}
