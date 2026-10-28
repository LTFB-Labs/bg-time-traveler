// @ts-check
// Пътешествие във времето inside LevAcademy: the shell loads this module in its sandboxed frame and calls mount().
// The game stays the same: its page (index.html) is put into the frame with a <base> at the game's folder, the
// progress (code/store.js, one key 'bgtt') is kept by the shell for this child instead of the browser, and a passed
// lesson's check gives a badge in the child's profile. Opened alone (index.html) the game does not use this file.
import { defineApp } from '../core/academy-core/app.js';

const base = new URL('.', import.meta.url);

/** Classic scripts as index.html loads them; the module last. @param {string} src @param {boolean} [module] */
function addScript(src, module = false) {
  return new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement('script'), { src: new URL(src, base).href, async: false });
    if (module) script.type = 'module';
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} не се зареди`));
    document.body.append(script);
  });
}

/** A badge code: small Latin letters, digits and dashes. @param {string} text */
const codeOf = (text) => text.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '').slice(0, 60) || 'lesson';

/** The game's lessons: content.js declares `const CONTENT`, which is global but not on window. @returns {any} */
// @ts-ignore: defined by content.js
const content = () => (typeof CONTENT === 'undefined' ? undefined : CONTENT);

/** @param {string | null} json */
const parse = (json) => { try { return JSON.parse(json || '{}') || {}; } catch { return {}; } };

export default defineApp({
  id: 'bg-time-traveler',
  name: 'Пътешествие във времето',
  description: 'Дърпай слайдъра и виж как се променя България от 600 г. до днес.',
  icon: 'img/mascot.webp',
  route: 'history',
  contract: 2,
  permissions: ['user', 'storage', 'badges'],

  async mount(el, core) {
    const w = /** @type {any} */ (window);

    // The game's page: styles from its <head>, the markup from its <body>, without the scripts.
    const page = new DOMParser().parseFromString(await (await fetch(new URL('index.html', base))).text(), 'text/html');
    document.head.prepend(Object.assign(document.createElement('base'), { href: base.href }));
    for (const node of page.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style')) document.head.append(node);
    document.documentElement.lang = 'bg';
    document.title = page.title;
    page.body.querySelectorAll('script').forEach((script) => script.remove());
    el.replaceWith(...page.body.childNodes);

    // With the <base>, an address that is only '#…' would point at the game's folder and the next reload would leave
    // the frame: keep such addresses on this page, for history.replaceState/pushState and for links.
    const here = () => location.href.split('#')[0];
    for (const name of /** @type {const} */ (['replaceState', 'pushState'])) {
      const original = history[name].bind(history);
      history[name] = (state, title, url) => {
        original(state, title, typeof url === 'string' && url.startsWith('#') ? here() + url : url);
        core.navigate(location.hash.replace(/^#/, ''));
      };
    }
    // With the <base>, a link like href="#lessons" would leave the frame: keep it on this page.
    document.addEventListener('click', (event) => {
      const link = /** @type {HTMLElement | null} */ (event.target instanceof Element ? event.target.closest('a[href^="#"]') : null);
      if (!link || event.defaultPrevented) return;
      event.preventDefault();
      location.hash = link.getAttribute('href') || '#';
    }, true);

    // The progress: read from the shell once, then kept in memory; every change goes to the shell too.
    const user = await core.getUser();
    const memory = new Map((await core.appData.all('progress')).map((row) => /** @type {any} */ (row)).map((row) => [row.id, row.value]));
    w.BGTT_STORAGE = {
      /** @param {string} key */
      getItem: (key) => memory.get(key) ?? null,
      /** @param {string} key @param {string} value */
      setItem(key, value) {
        const before = parse(memory.get(key) ?? null);
        memory.set(key, value);
        core.appData.put('progress', { id: key, value }).catch((error) => console.warn('Напредъкът не се записа:', error));
        if (user && 'badges' in user) giveBadges(before, parse(value));
      },
    };

    /** A passed lesson's check and the first won battle of the Quest give badges. @param {any} before @param {any} after */
    function giveBadges(before, after) {
      for (const id of Object.keys(after.passed || {})) {
        if (before.passed?.[id]) continue;
        const lesson = content()?.lessons?.[id];
        core.grantUserBadge({
          code: `lesson-${codeOf(id)}`,
          name: lesson?.title || 'Минат урок',
          icon: 'core:medal-bronze',
          description: 'Урок от „Пътешествие във времето“',
          reason: 'Мина проверката на урока',
        }).catch((error) => console.warn('Значката не се даде:', error));
      }
      if (!Object.keys(before.quest || {}).length && Object.keys(after.quest || {}).length) {
        core.grantUserBadge({
          code: 'quest-first-battle',
          name: 'Първа битка',
          icon: 'core:trophy',
          description: 'Походът в „Пътешествие във времето“',
          reason: 'Спечели първата си битка в Похода',
        }).catch((error) => console.warn('Значката не се даде:', error));
      }
    }

    // The address inside the game follows the shell's: /app/#/history/lessons opens the lesson hall.
    if (location.hash.length <= 1 && core.route) location.hash = `#${core.route}`;
    if (location.hash.length > 1) document.documentElement.classList.add('deep-link');
    addEventListener('hashchange', () => core.navigate(location.hash.replace(/^#/, '')));

    await addScript('geo.js');
    await addScript('content.js');
    await addScript('apps/narrator/narrator.js');
    await addScript('modules/app.js', true);
  },
});
