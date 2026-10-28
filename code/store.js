// Progress in localStorage under one key. Every storage access is guarded: a private window or a full disk must not break a lesson.
const KEY = 'bgtt';

// pins: the look of the map's markers, picked in the options menu; today: whether the map shows today's Bulgaria;
// bar: whether a lesson's header bar (grade, number, Уроци, gear, trail) is open; quest: the best stars (1–3) won at each Quest stop;
// last: the lesson opened last, where a bare visit to the app goes back to; blur: the blur on the lesson map's edges, on or off and its size in px
const defaults = () => ({ passed: {}, cards: [], position: {}, pins: 'seal', today: false, bar: false, quest: {}, last: null, blur: { on: true, px: 1.5 } });

export function createStore(storage) {
    const loadProgress = () => {
        try {
            return { ...defaults(), ...JSON.parse(storage.getItem(KEY)) };
        } catch {
            return defaults();
        }
    };
    const saveProgress = (progress) => {
        try {
            storage.setItem(KEY, JSON.stringify(progress));
        } catch {
            // progress is lost for this sitting only
        }
    };
    const update = (change) => {
        const progress = loadProgress();
        change(progress);
        saveProgress(progress);
    };
    return {
        loadProgress,
        saveProgress,
        markCardOpened: (id) => update((p) => { if (!p.cards.includes(id)) p.cards.push(id); }),
        markPassed: (lessonId) => update((p) => { p.passed[lessonId] = new Date().toISOString(); }),
        setPosition: (lessonId, n) => update((p) => { p.position[lessonId] = n; }),
        setLast: (lessonId) => update((p) => { p.last = lessonId; }),
        setPins: (look) => update((p) => { p.pins = look; }),
        setToday: (isShown) => update((p) => { p.today = isShown; }),
        setBar: (isOpen) => update((p) => { p.bar = isOpen; }),
        setBlur: (blur) => update((p) => { p.blur = { ...p.blur, ...blur }; }),
        // a stop keeps its best result: winning again with fewer stars takes nothing away
        setQuestStars: (id, stars) => update((p) => { p.quest[id] = Math.max(p.quest[id] ?? 0, stars); }),
        // everything the child did goes; the marker look, today's borders, the header bar and the blur are settings, so they stay
        resetProgress: () => {
            const { pins, today, bar, blur } = loadProgress();
            saveProgress({ ...defaults(), pins, today, bar, blur });
        },
    };
}

// window.localStorage is read when a function runs, never at import time. Inside LevAcademy, academy-app.js puts
// the shell's storage in window.BGTT_STORAGE, so the progress is the child's on every device.
const storage = () => window.BGTT_STORAGE ?? window.localStorage;
const lazyStorage = {
    getItem: (k) => storage().getItem(k),
    setItem: (k, v) => storage().setItem(k, v),
};

export const {
    loadProgress,
    saveProgress,
    markCardOpened,
    markPassed,
    setPosition,
    setLast,
    setPins,
    setToday,
    setBar,
    setBlur,
    setQuestStars,
    resetProgress,
} = createStore(lazyStorage);
