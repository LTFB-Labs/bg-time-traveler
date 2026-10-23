// Progress in localStorage under one key. Every storage access is guarded: a private window or a full disk must not break a lesson.
const KEY = 'bgtt';

const defaults = () => ({ passed: {}, cards: [], position: {} });

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
} = createStore(lazyStorage);
