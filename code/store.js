// Progress in localStorage under one key. Every storage access is guarded: a private window or a full disk must not break a lesson.
const KEY = 'bgtt';

// pins: the look of the map's markers, picked in the options menu; today: whether the map shows today's Bulgaria;
// bar: whether a lesson's header bar (grade, number, Уроци, gear, trail) is open
const defaults = () => ({ passed: {}, cards: [], position: {}, pins: 'seal', today: false, bar: false });

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
        setPins: (look) => update((p) => { p.pins = look; }),
        setToday: (isShown) => update((p) => { p.today = isShown; }),
        setBar: (isOpen) => update((p) => { p.bar = isOpen; }),
        // everything the child did goes; the marker look, today's borders and the header bar are settings, so they stay
        resetProgress: () => {
            const { pins, today, bar } = loadProgress();
            saveProgress({ ...defaults(), pins, today, bar });
        },
    };
}

// window.localStorage is read when a function runs, never at import time
const lazyStorage = {
    getItem: (k) => window.localStorage.getItem(k),
    setItem: (k, v) => window.localStorage.setItem(k, v),
};

export const {
    loadProgress,
    saveProgress,
    markCardOpened,
    markPassed,
    setPosition,
    setPins,
    setToday,
    setBar,
    resetProgress,
} = createStore(lazyStorage);
