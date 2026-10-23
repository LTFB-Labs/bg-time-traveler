// The check's answers and the rules that mark them green or red. Pure: node imports it for the tests.
import { haversineKm } from './geo.js';

// answers[i]: the latest answer to question i, { isCorrect, value }; greenOnce[i]: question i was green at least once this sitting
export const initialState = () => ({ answers: {}, greenOnce: {} });

export function answer(state, qIndex, isCorrect, value) {
    const answers = { ...state.answers, [qIndex]: { isCorrect, value } };
    const greenOnce = isCorrect ? { ...state.greenOnce, [qIndex]: true } : state.greenOnce;
    return { answers, greenOnce };
}

// "Опитай пак": the question is open again; an earlier green still counts
export function retry(state, qIndex) {
    const answers = { ...state.answers };
    delete answers[qIndex];
    return { ...state, answers };
}

export const isPassed = (state, questions) => questions.every((q, i) => state.greenOnce[i]);

export const tapIsCorrect = (q, lonlat) => haversineKm(q.at, lonlat) <= q.tolerance_km;
export const orderIsCorrect = (q, chosenIds) => chosenIds.length === q.items.length && q.items.every((id, i) => chosenIds[i] === id);
export const chooseIsCorrect = (q, idx) => idx === q.answer;
export const pickBorderIsCorrect = (q, idx) => idx === q.answer;
// pairsChosen: { [card id]: description }
export const matchIsCorrect = (q, pairsChosen) => q.pairs.every(([id, text]) => pairsChosen[id] === text);

const IS_CORRECT = { tap: tapIsCorrect, order: orderIsCorrect, choose: chooseIsCorrect, 'pick-border': pickBorderIsCorrect, match: matchIsCorrect };

export const isCorrect = (q, value) => IS_CORRECT[q.type](q, value);

// Fisher-Yates driven by a seeded generator, so a question shows the same order every time;
// a shuffle that lands on the original order is turned by one, so the chips never show the answer
export function shuffle(list, seed) {
    const random = seededRandom(seed);
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    const isUnchanged = out.every((x, i) => x === list[i]);
    return isUnchanged ? [...out.slice(1), out[0]] : out;
}

// mulberry32: a tiny generator with good spread even for seeds 0, 1, 2
function seededRandom(seed) {
    let a = seed;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
