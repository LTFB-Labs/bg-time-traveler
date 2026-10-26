// The Quest's sections, learning-materials/quest/sections.json: a list of { id, title, description, photo, color, grade, lessons }.
// A section is a stretch of the path in its own colour that ends with a boss: its picture (a photo id of an info package), a short
// description and its lesson numbers; a number may name a lesson that is not written yet.
import { problem } from './problems.mjs';

const FILE = 'quest/sections.json';

export function sectionProblems(sections, photos) {
    if (!Array.isArray(sections)) return [problem(FILE, 'must be a list of sections')];
    const seen = new Set();
    return sections.flatMap((section, i) => {
        const { id, title, description, photo, color, grade, lessons } = section ?? {};
        const messages = [
            ...(typeof id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) ? [] : ['needs an id like "first-kingdom"']),
            ...(seen.has(id) ? [`id "${id}" is used twice`] : []),
            ...(typeof title === 'string' && title.trim() ? [] : ['needs a title']),
            ...(typeof description === 'string' && description.trim() ? [] : ['needs a description']),
            ...(photos.has(photo) ? [] : [`photo "${photo}" is not a photo of an info package`]),
            ...(typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? [] : ['needs a colour like "#7a1e12"']),
            ...(Number.isInteger(grade) ? [] : ['needs a grade']),
            ...(Array.isArray(lessons) && lessons.length > 0 && lessons.every(Number.isInteger) ? [] : ['needs lesson numbers']),
        ];
        seen.add(id);
        return messages.map((message) => problem(FILE, `section ${i + 1}: ${message}`));
    });
}
