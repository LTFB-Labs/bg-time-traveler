/* AI учител: разказва свободната линия на времето или урока с гласа на браузъра (Web Speech API).
   Говори с играта само през window.BGTT (items, current, goTo, stage, dock, on), затова може да се махне,
   без играта да разбере. Всичко свое — кълбо, балонче, снимка, стилове — създава сам.
   Урокът дава и незадължителни полета: title (името му), end ({ say, id }: накъде води след последната част),
   item.when (годината, както се казва) и item.wait ({ say, note }: въпрос, на който детето отговаря, преди да продължи). */
(() => {
"use strict";

const start = (app) => {
  if (!app || app.version !== 1) return;

  /* ---------- styles ---------- */
  const css = `
.nar-orb{position:fixed;z-index:15;width:var(--nar-size,68px);height:var(--nar-size,68px);margin:0;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;touch-action:none;transition:opacity .35s,filter .35s,transform .25s,scale .3s ease,top .45s cubic-bezier(.3,1.3,.5,1),left .45s cubic-bezier(.3,1.3,.5,1);transform-origin:0 0;-webkit-tap-highlight-color:transparent}
.nar-orb:focus-visible{outline:3px solid #7a1e12;outline-offset:4px}
.nar-orb .core{position:absolute;inset:0;border-radius:50%;transition:transform .55s cubic-bezier(.3,1.35,.5,1)}
.nar-orb .glow,.nar-orb .swirl,.nar-orb .blobs{position:absolute;border-radius:50%;animation:narSpin 7s linear infinite;animation-play-state:paused}
.nar-orb .glow{inset:-5px;background:conic-gradient(from 20deg,#5b8cff,#9b5cff,#ff5ea8,#ffae4d,#3fd3c4,#5b8cff);filter:blur(10px);opacity:.55}
.nar-orb .swirl{inset:2px;background:conic-gradient(from 200deg,#4f7dff,#9b5cff,#ff5ea8,#ffae4d,#3fd3c4,#4f7dff)}
.nar-orb .blobs{inset:2px;animation-direction:reverse;animation-duration:5s;mix-blend-mode:screen;background:radial-gradient(circle at 30% 28%,rgba(255,255,255,.75),transparent 34%),radial-gradient(circle at 72% 70%,rgba(120,240,255,.7),transparent 38%),radial-gradient(circle at 75% 25%,rgba(255,120,200,.55),transparent 30%)}
.nar-orb .glass{position:absolute;inset:9px;border-radius:50%;background:radial-gradient(circle at 38% 30%,rgba(255,255,255,.42),rgba(255,255,255,.06) 55%,rgba(30,10,60,.28));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55),inset 0 -6px 14px rgba(40,10,80,.35)}
.nar-orb > :is(svg,img){position:absolute;left:50%;top:50%;width:46%;height:46%;transform:translate(-50%,-50%);color:#fff;filter:drop-shadow(0 1px 2px rgba(40,10,80,.45));transition:opacity .25s,transform .25s}
.nar-orb .i-play,.nar-orb .i-pause{opacity:0;transform:translate(-50%,-50%) scale(.6)}
.nar-orb[data-state=dormant]{opacity:.55;filter:saturate(.1) brightness(1.06)}
.nar-orb[data-state=dormant]:hover,.nar-orb[data-state=dormant]:focus-visible{opacity:1;filter:none;scale:1.25;transition:opacity .35s,filter .35s,transform .25s,scale .8s linear(0,.3 3%,.85 7%,1.18 11%,1.3 14%,1.27 17%,1.08 23%,.94 29%,.92 33%,.98 41%,1.02 48%,1.01 57%,1)}
/* on hover the dormant teacher grows a quarter with a spring, shows its colours and asks; no play icon over its face */
.nar-orb[data-state=dormant]::after{content:"Искаш ли да ти разкажа?";position:absolute;left:calc(100% + 14px);top:50%;translate:0 -50%;white-space:nowrap;padding:9px 14px;border-radius:16px 16px 16px 4px;background:#fbf4e2;color:#4b3722;font:800 14px/1.2 Nunito,system-ui,sans-serif;box-shadow:0 0 0 1px #d8c39a,0 6px 16px rgba(60,40,15,.25);opacity:0;scale:.85;transform-origin:0 70%;transition:opacity .2s,scale .25s cubic-bezier(.3,1.5,.5,1);pointer-events:none}
.nar-orb[data-side=left]::after{left:auto;right:calc(100% + 14px);border-radius:16px 16px 4px 16px;transform-origin:100% 70%}
.nar-orb[data-state=dormant]:hover::after,.nar-orb[data-state=dormant]:focus-visible::after{opacity:1;scale:.8}
.nar-orb[data-state=paused]:hover .i-person{opacity:0;transform:translate(-50%,-50%) scale(.6)}
.nar-orb[data-state=paused]:hover .i-play{opacity:1;transform:translate(-50%,-50%) scale(1)}
.nar-orb[data-state=playing]:hover .i-person{opacity:0;transform:translate(-50%,-50%) scale(.6)}
.nar-orb[data-state=playing]:hover .i-pause{opacity:1;transform:translate(-50%,-50%) scale(1)}
.nar-orb[data-state=asking] .glow,.nar-orb[data-state=asking] .swirl,.nar-orb[data-state=asking] .blobs,.nar-orb[data-state=playing] .glow,.nar-orb[data-state=playing] .swirl,.nar-orb[data-state=playing] .blobs{animation-play-state:running}
.nar-orb[data-state=playing] .glow,.nar-orb[data-state=playing] .swirl{animation-duration:2.6s}
.nar-orb[data-state=playing] .glow{opacity:.85}
.nar-orb[data-state=paused]{filter:saturate(.75)}
.nar-orb.beat .glow{opacity:1}
.nar-orb.drag{cursor:grabbing;transform:scale(1.08);transition:none}
@keyframes narSpin{to{transform:rotate(360deg)}}
/* active: the orb lies down as a spinning disk, light rises from it and the monster stands on top */
.nar-orb:not([data-state=dormant]) .core{transform:translateY(20px) scale(1.5,.54)}
.nar-orb:not([data-state=dormant]) > :is(svg,img){opacity:0!important}
.nar-orb:not([data-state=dormant]) .glow{inset:-9px;filter:blur(12px)}
.nar-orb .beam{position:absolute;left:50%;bottom:14px;width:93px;height:104px;margin-left:-46.5px;background:linear-gradient(to top,rgba(150,180,255,.8),rgba(255,130,210,.32) 45%,rgba(120,240,255,0));clip-path:polygon(10% 100%,90% 100%,100% 0,0 0);filter:blur(5px);mix-blend-mode:screen;opacity:0;transform:scaleY(.15);transform-origin:50% 100%;transition:opacity .5s,transform .6s;pointer-events:none}
.nar-orb:not([data-state=dormant]) .beam{opacity:.85;transform:none;animation:narBeam 2.4s ease-in-out infinite}
.nar-orb[data-state=paused] .beam{opacity:.35;animation:none}
.nar-orb > img.i-person{width:80%;height:80%;border-radius:50%;filter:none}
/* the teacher is the LTFB fluff reading (img/mascot.webp); it bobs while talking, the orb shows its face (img/mascot-face.webp) */
.nar-orb .mon{position:absolute;left:50%;bottom:16px;width:116px;height:96px;margin-left:-58px;opacity:0;transform:translateY(26px) scale(.4);transform-origin:50% 100%;transition:opacity .4s,transform .65s cubic-bezier(.3,1.5,.5,1);pointer-events:none}
.nar-orb .mon img{display:block;width:100%;height:100%;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 5px 7px rgba(120,150,255,.6))}
.nar-orb .mon::after{content:"";position:absolute;inset:35% -12% -8%;background:radial-gradient(ellipse at 50% 100%,rgba(140,200,255,.65),rgba(255,120,210,.22) 45%,transparent 70%);mix-blend-mode:screen;pointer-events:none}
.nar-orb:not([data-state=dormant]) .mon{opacity:1;transform:scale(1.3)}
/* awake, the whole teacher can be taken and carried, not only the small orb under it */
.nar-orb:not([data-state=dormant]){cursor:grab}
.nar-orb:not([data-state=dormant]) .mon{pointer-events:auto}
.nar-orb[data-state=asking] .mon img,.nar-orb[data-state=playing] .mon img{animation:narBob 2.2s ease-in-out infinite}
.nar-orb.talk .mon img{transform-origin:50% 100%;animation:narBob 2.2s ease-in-out infinite,narTalk .2s ease-in-out infinite alternate}
@keyframes narTalk{to{scale:1.035 .97}}
@keyframes narBob{50%{transform:translateY(-3px)}}
@keyframes narBeam{50%{opacity:.6}}
.nar-bubble{position:fixed;z-index:16;width:min(420px,calc(100vw - 32px));padding:16px 20px 14px;border-radius:18px;background:#fbf4e2;color:#3f2a14;border:1px solid #d8c39a;box-shadow:0 12px 34px rgba(60,40,15,.28),0 2px 6px rgba(60,40,15,.15);font:600 16px/1.45 Nunito,system-ui,sans-serif;animation:narIn .25s ease-out}
.nar-bubble[hidden]{display:none}
.nar-bubble .who{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-weight:900;font-size:13px;letter-spacing:.04em;color:#7a1e12;text-transform:uppercase}
.nar-bubble .who i{width:9px;height:9px;border-radius:50%;background:conic-gradient(#5b8cff,#9b5cff,#ff5ea8,#ffae4d,#3fd3c4,#5b8cff)}
.nar-bubble .who button{margin-left:auto;border:0;background:#efe0bc;color:#5b3d17;width:28px;height:28px;border-radius:50%;font:900 16px/1 Nunito,sans-serif;cursor:pointer}
.nar-bubble .say{margin:0;font-size:19.5px;line-height:1.45;min-height:1.45em}
.nar-bubble .say.dim{opacity:.55}
.nar-bubble .note{margin:8px 0 0;font-size:14.5px;color:#8a7352}
.nar-bubble .acts{display:flex;gap:8px;margin-top:12px}
.nar-bubble .acts button{flex:1;border:0;border-radius:12px;padding:10px 12px;font:900 15px Nunito,sans-serif;cursor:pointer;background:#efe0bc;color:#5b3d17}
.nar-bubble .acts button.yes{background:#c8402f;color:#fff}
.nar-bubble .acts button:focus-visible,.nar-bubble .who button:focus-visible{outline:3px solid #7a1e12;outline-offset:2px}
.nar-photo{position:fixed;z-index:14;margin:0;padding:10px 10px 8px;background:#fffdf6;border-radius:6px;box-shadow:0 18px 50px rgba(40,25,10,.4),0 3px 8px rgba(40,25,10,.25);opacity:0;transform:translateY(18px) rotate(-3deg) scale(.92);transition:opacity .45s ease,transform .55s cubic-bezier(.2,1.2,.4,1);pointer-events:none}
.nar-photo.show{opacity:1;transform:rotate(-1.2deg)}
.nar-photo img{display:block;max-width:100%;max-height:calc(var(--nar-ph,60vh) - 44px);border-radius:2px;margin:0 auto}
.nar-photo figcaption{margin-top:6px;font:400 17px/1.2 Kurale,Georgia,serif;color:#3f230f;text-align:center}
.nar-photo figcaption small{display:block;margin-top:2px;font:600 10.5px Nunito,sans-serif;color:#8a7352}
@keyframes narIn{from{opacity:0;transform:translateY(8px)}}
@media (max-width:760px){.nar-orb{--nar-size:58px}.nar-orb:not([data-state=dormant]) .core{transform:translateY(17px) scale(1.5,.54)}.nar-orb .mon{width:98px;height:82px;margin-left:-49px;bottom:13px}.nar-orb .beam{width:78px;height:88px;margin-left:-39px;bottom:12px}.nar-bubble{font-size:15px}.nar-bubble .say{font-size:15.5px}}
@media (prefers-reduced-motion:reduce){.nar-orb .glow,.nar-orb .swirl,.nar-orb .blobs,.nar-orb .beam,.nar-orb .mon img{animation:none!important}.nar-photo{transition:opacity .3s}}
`;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  /* ---------- DOM ---------- */
  const orb = document.createElement("button");
  orb.type = "button"; orb.className = "nar-orb"; orb.dataset.state = "dormant";
  orb.setAttribute("aria-label", "Учител: разкажи ми урока");
  orb.innerHTML = `<span class="core"><span class="glow"></span><span class="swirl"></span><span class="blobs"></span><span class="glass"></span></span><span class="beam"></span><span class="mon"><img src="img/mascot.webp" alt=""></span>
<img class="i-person" src="img/mascot-face.webp" alt="" aria-hidden="true">
<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 4.8v14.4L19.5 12z"/></svg>
<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.4" height="14" rx="1.3"/><rect x="13.6" y="5" width="4.4" height="14" rx="1.3"/></svg>`;
  const bubble = document.createElement("div"); bubble.className = "nar-bubble"; bubble.hidden = true; bubble.setAttribute("role", "status"); bubble.setAttribute("aria-live", "polite");
  const photo = document.createElement("figure"); photo.className = "nar-photo"; photo.setAttribute("aria-hidden", "true");
  document.body.append(photo, orb, bubble);

  /* ---------- voice ---------- */
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  let voice = null;
  const pickVoice = () => {
    if (!synth) return;
    const vs = synth.getVoices().filter((v) => /^bg/i.test(v.lang));
    // best first: Edge's neural "Online (Natural)" voices, then Apple's enhanced ones, then any Bulgarian voice
    voice = vs.find((v) => /natural|neural/i.test(v.name)) || vs.find((v) => /premium|enhanced/i.test(v.name)) || vs.find((v) => v.localService) || vs[0] || null;
  };
  if (synth) { pickVoice(); synth.addEventListener?.("voiceschanged", pickVoice); }

  let speakToken = 0;
  function stopSpeech() { speakToken++; orb.classList.remove("talk"); if (synth) synth.cancel(); }
  // resolves true when the sentence was read to the end, false when it was interrupted
  function speak(text) {
    const tok = ++speakToken;
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => { if (done) return; done = true; clearTimeout(guard); if (tok === speakToken) orb.classList.remove("talk"); resolve(ok && tok === speakToken); };
      const guard = setTimeout(() => finish(true), 4000 + text.length * 110); // some engines never fire "end"
      if (!synth || !voice) { setTimeout(() => finish(true), Math.min(9000, Math.max(1600, text.length * 62))); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang; u.rate = .95; u.pitch = 1.04;
      u.onboundary = () => { orb.classList.add("beat"); setTimeout(() => orb.classList.remove("beat"), 110); };
      u.onstart = () => { if (tok === speakToken) orb.classList.add("talk"); };
      u.onend = () => finish(true);
      u.onerror = (e) => finish(!(e.error === "interrupted" || e.error === "canceled"));
      speak.keep = u; // Chrome drops the callbacks of utterances that get garbage-collected
      synth.speak(u);
    });
  }

  /* ---------- turning the data into a teacher's words ---------- */
  const ROMAN = { I: "Първи", II: "Втори", III: "Трети", IV: "Четвърти", V: "Пети" };
  const spoken = (s) => s
    .replace(/(\d+)\s*[–-]\s*(\d+)\s*г\./g, "$1 до $2 година")
    .replace(/(\d+)\s*г\./g, "$1 година")
    .replace(/\s*пр\.\s?Хр\./g, " преди Христа")
    .replace(/\s*сл\.\s?Хр\./g, "")
    .replace(/(?<![\p{L}])ок\.\s/gu, "около ")
    .replace(/(\p{Lu}\p{Ll}+)\s+(IV|V|III|II|I)(?![\p{L}])/gu, (m, w, r) => `${w} ${ROMAN[r]}`)
    .replace(/(?<![\p{L}])ЕС(?![\p{L}])/gu, "Европейския съюз")
    .replace(/\s+—\s+/g, ", ");
  const sentences = (s) => spoken(s).split(/(?<=[.!?…])\s+(?=[„"(\p{Lu}\d])/u).filter(Boolean);
  const yearWord = (y) => `${y} година`;
  function eraLines(era, opening) {
    const span = era.when ?? `от ${era.from} ${era.to ? `до ${era.to} година` : "година до днес"}`;
    const head = opening ? `Сега сме в епохата „${era.name}“, ${span}.` : `Започва нова епоха: „${era.name}“, ${span}.`;
    return [head, ...sentences(era.text)];
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function yearLine(it, prev, opening) {
    if (it.year == null) return "";
    if (it.when) { // a lesson says its own years, before Christ too
      const gap = prev && prev.year != null ? it.year - prev.year : 0;
      return !opening && gap >= 100 ? `Прескачаме цели ${gap} години напред: ${it.when}.` : `${cap(it.when)}.`;
    }
    if (opening || !prev) return `Започваме през ${yearWord(it.year)}.`;
    const gap = it.year - prev.year;
    if (gap === 0) return `Пак през ${yearWord(it.year)}.`;
    if (gap >= 100) return `Прескачаме цели ${gap} години напред, до ${yearWord(it.year)}.`;
    return [`Минаваме към ${yearWord(it.year)}.`, `Да видим какво става през ${yearWord(it.year)}.`, `През ${yearWord(it.year)}.`][it.year % 3];
  }
  // one lesson step = a list of sentences; the photo shows with the title and hides halfway through the text
  function script(i, opening) {
    const it = items[i], prev = items[i - 1], out = [];
    if (it.era && (opening || !prev || prev.era?.name !== it.era.name)) eraLines(it.era, opening).forEach((say) => out.push({ say }));
    const year = yearLine(it, prev, opening); if (year) out.push({ say: year });
    out.push({ say: spoken(it.title) + ".", photo: it.photo ? "show" : null });
    if (it.wait) { it.wait.say.forEach((say) => out.push({ say: spoken(say) })); out.push({ wait: true }); return out; }
    return out.concat(bodyScript(it));
  }
  function bodyScript(it) {
    const body = sentences(it.text), cut = Math.max(1, Math.ceil(body.length / 2));
    return body.map((say, k) => ({ say, photo: k === cut && it.photo ? "hide" : null }));
  }

  /* ---------- photo the teacher holds up ---------- */
  function showPhoto(it) {
    const st = app.stage(), p = it.photo;
    photo.innerHTML = `<img alt="" src="${p.src}"><figcaption>${esc(it.title)}<small>Снимка: ${esc(p.author)}, ${esc(p.license)}</small></figcaption>`;
    const w = Math.min(st.w * .72, 560), h = Math.min(st.h * .86, 520);
    photo.style.setProperty("--nar-ph", h + "px");
    photo.style.maxWidth = w + "px";
    const img = photo.querySelector("img");
    const place = () => { const r = photo.getBoundingClientRect(); photo.style.left = Math.round(st.x + (st.w - r.width) / 2) + "px"; photo.style.top = Math.round(st.y + (st.h - r.height) / 2) + "px"; photo.classList.add("show"); };
    (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => requestAnimationFrame(place));
  }
  const hidePhoto = () => photo.classList.remove("show");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- lesson state ---------- */
  let items = app.items();
  // waiting: the part asked the child a question on screen; its answer brings a "focus" with the rest of the part
  let mode = "dormant", idx = 0, seg = 0, segs = [], run = 0, moved = false, waiting = false, lastSay = "";
  const indexOf = (id) => items.findIndex((x) => x.id === id);
  function indexFromTimeline() {
    const cur = app.current();
    if (cur.item) return indexOf(cur.item.id);
    const n = items.findIndex((x) => x.year > cur.year);
    return n < 0 ? items.length - 1 : n;
  }
  function setMode(m) { const woke = (mode === "dormant") !== (m === "dormant"); mode = m; orb.dataset.state = m; document.body.classList.toggle("teacher-on", m !== "dormant"); if (woke) placeOrb(); orb.setAttribute("aria-label", { dormant: "Учител: разкажи ми урока", asking: "Учител", playing: "Пауза", paused: "Продължи урока" }[m]); render(); }

  function ask() {
    idx = indexFromTimeline();
    const cur = app.current();
    let q;
    if (app.title) {
      if (!cur.item) idx = 0;
      q = `Здравей! Аз съм твоят учител по история. Да ти разкажа ли урока „${app.title}“${idx > 0 ? ` от частта „${items[idx].title}“` : ""}?`;
    }
    else if (cur.item && idx === items.length - 1) { idx = 0; q = "Здравей! Аз съм твоят учител по история. Стигнали сме до днес. Да ти разкажа ли урока от самото начало?"; }
    else if (cur.item) q = `Здравей! Аз съм твоят учител по история. Да ти разкажа ли урока от ${yearWord(items[idx].year)} — „${items[idx].title}“?`;
    else q = `Здравей! Аз съм твоят учител по история. Да ти разкажа ли урока от ${yearWord(cur.year)} нататък?`;
    lastSay = q; setMode("asking");
    requestAnimationFrame(() => bubble.querySelector(".yes")?.focus({ preventScroll: true }));
  }
  function begin(i, opening) {
    run++; const r = run; stopSpeech(); hidePhoto();
    items = app.items(); // a lesson part that was guessed since is read in full now
    idx = i; seg = 0; segs = script(i, opening); moved = false; waiting = false; setMode("playing");
    app.goTo(items[i].id).then(() => { if (r === run && mode === "playing") step(r); });
  }
  function step(r) {
    if (r !== run || mode !== "playing") return;
    if (seg >= segs.length) {
      hidePhoto();
      setTimeout(() => {
        if (r !== run || mode !== "playing") return;
        if (idx + 1 >= items.length) finish(); else begin(idx + 1, false);
      }, 900);
      return;
    }
    const s = segs[seg];
    if (s.wait) { run++; waiting = true; setMode("paused"); return; }
    if (s.photo === "show") showPhoto(items[idx]);
    if (s.photo === "hide") hidePhoto();
    lastSay = s.say; render();
    speak(s.say).then((ok) => { if (ok && r === run && mode === "playing") { seg++; step(r); } });
  }
  function pause() { if (mode !== "playing") return; run++; stopSpeech(); setMode("paused"); }
  function resume() {
    if (mode !== "paused") return;
    if (waiting) { render(); return; } // only the child's answer goes on
    if (moved) { begin(indexFromTimeline(), true); return; } // the viewer moved the timeline: continue from there
    run++; setMode("playing"); step(run);
  }
  const next = () => { if (idx + 1 < items.length) begin(idx + 1, false); };
  const prev = () => { if (idx > 0) begin(idx - 1, false); };
  function finish() {
    run++; const r = run; hidePhoto();
    const end = app.end;
    lastSay = end ? end.say : "Това беше нашият урок по история на България. Браво, че слуша до края!"; render();
    if (end) app.goTo(end.id);
    speak(lastSay).then(() => { if (r === run) stop(); });
  }
  // switched off, the teacher goes home to its corner; a place the child dragged it to lasts only while it talks
  function stop() { run++; stopSpeech(); hidePhoto(); setMode("dormant"); custom = null; try { localStorage.removeItem(KEY); } catch (e) {} placeOrb(); }

  // the child opened another part: while talking the teacher reads that part, while paused it continues from there
  app.on("input", () => { if (mode === "playing") begin(indexFromTimeline(), true); else if (mode === "paused") { moved = true; waiting = false; } });
  // the child answered the question the teacher waits on: read the rest of that part
  app.on("focus", ({ item }) => {
    if (!waiting || mode !== "paused" || !item || item.id !== items[idx].id || item.wait) return;
    items[idx] = item; waiting = false; segs = bodyScript(item); seg = 0;
    run++; setMode("playing"); step(run);
  });

  /* ---------- bubble ---------- */
  function render() {
    if (mode === "dormant") { bubble.hidden = true; return; }
    const head = `<p class="who"><i></i>Учителят<button type="button" class="x" aria-label="Спри урока">×</button></p>`;
    if (mode === "asking") {
      const note = !synth || !voice ? `<p class="note">На това устройство няма български глас, затова ще пиша урока тук.</p>`
        : /natural|neural/i.test(voice.name) ? "" : `<p class="note">За по-хубав глас отвори играта в Microsoft Edge.</p>`;
      bubble.innerHTML = `${head}<p class="say">${esc(lastSay)}</p>${note}<div class="acts"><button type="button" class="yes">Да, разкажи</button><button type="button" class="no">Не сега</button></div>`;
    } else if (mode === "playing") {
      bubble.innerHTML = `${head}<p class="say">${esc(lastSay)}</p>`;
    } else {
      const note = waiting ? items[idx].wait.note : `Пауза. Натисни интервал или кълбото, за да продължа${moved ? " оттам, докъдето стигна" : ""}.`;
      bubble.innerHTML = `${head}<p class="say${waiting ? "" : " dim"}">${esc(lastSay)}</p><p class="note">${esc(note)}</p>`;
    }
    bubble.hidden = false; placeBubble();
  }
  bubble.addEventListener("click", (e) => {
    if (e.target.closest(".yes")) begin(idx, true);
    else if (e.target.closest(".no") || e.target.closest(".x")) stop();
  });
  function placeBubble() {
    // the orb's place to be, not where it is now: it may still be sliding there
    const ox = parseFloat(orb.style.left) || 0, oy = parseFloat(orb.style.top) || 0, size = orb.offsetWidth;
    const o = { left: ox, top: oy, width: size, right: ox + size, bottom: oy + size };
    const b = bubble.getBoundingClientRect(), W = innerWidth, H = innerHeight, m = 12;
    let left = o.left + o.width / 2 > W / 2 ? o.right - b.width : o.left;
    left = Math.max(16, Math.min(W - 16 - b.width, left));
    // below the orb while the free map has room for it there (above it are the game's own controls), otherwise above the monster
    const st = app.stage(), lift = mode === "dormant" ? 0 : 66; // the monster stands above the orb
    let top = o.bottom + m;
    if (top + b.height > Math.min(H - 12, st.y + st.h)) top = o.top - lift - b.height - m;
    if (top < 12) top = Math.min(H - b.height - 12, o.bottom + m);
    bubble.style.left = Math.round(left) + "px"; bubble.style.top = Math.round(top) + "px";
  }

  /* ---------- orb position: docked in the timeline slot, or wherever the viewer drags it ---------- */
  const KEY = "bgtt-narrator-pos";
  let custom = null;
  try { custom = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { custom = null; }
  function placeOrb() {
    const size = orb.offsetWidth || 68;
    let x, y;
    if (custom && mode !== "dormant") { x = custom.x * innerWidth - size / 2; y = custom.y * innerHeight - size / 2; }
    // at the slot's left edge; asleep at its top, awake lower down, so the teacher standing over the orb has room above it
    // awake it steps a little right, so the teacher standing over it stays on screen
    else { const d = app.dock(); x = mode === "dormant" ? d.left : d.left + 78; y = mode === "dormant" ? d.top + 4 : d.bottom - size - 8; }
    x = Math.max(8, Math.min(innerWidth - size - 8, x)); y = Math.max(8, Math.min(innerHeight - size - 8, y));
    orb.style.left = Math.round(x) + "px"; orb.style.top = Math.round(y) + "px";
    orb.dataset.side = x + size / 2 > innerWidth / 2 ? "left" : "right"; // the hover question opens toward the middle
    if (!bubble.hidden) placeBubble();
  }
  let drag = null, justDragged = false;
  orb.addEventListener("pointerdown", (e) => { if (mode === "dormant") return; drag = { x: e.clientX, y: e.clientY, ox: orb.offsetLeft, oy: orb.offsetTop, on: false }; orb.setPointerCapture(e.pointerId); });
  orb.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && Math.hypot(dx, dy) < 6) return;
    drag.on = true; orb.classList.add("drag");
    orb.style.left = drag.ox + dx + "px"; orb.style.top = drag.oy + dy + "px";
    if (!bubble.hidden) placeBubble();
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.on) {
      const size = orb.offsetWidth;
      custom = { x: (orb.offsetLeft + size / 2) / innerWidth, y: (orb.offsetTop + size / 2) / innerHeight };
      try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (e) {}
      justDragged = true; setTimeout(() => (justDragged = false), 0);
      placeOrb();
    }
    orb.classList.remove("drag"); drag = null;
  };
  orb.addEventListener("pointerup", endDrag); orb.addEventListener("pointercancel", endDrag);
  orb.addEventListener("dblclick", () => { custom = null; try { localStorage.removeItem(KEY); } catch (e) {} placeOrb(); });
  orb.addEventListener("click", () => {
    if (justDragged) return;
    if (mode === "dormant") ask();
    else if (mode === "asking") stop();
    else if (mode === "playing") pause();
    else resume();
  });
  addEventListener("resize", placeOrb);
  placeOrb(); requestAnimationFrame(placeOrb);

  /* ---------- keyboard: while the teacher is on, its keys win over the timeline's ---------- */
  addEventListener("keydown", (e) => {
    if (mode === "dormant" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.("input, textarea")) return; // keys typed in the search box stay in the box
    let used = true;
    if (e.key === " " || e.key === "Spacebar") { if (mode === "asking") begin(idx, true); else if (mode === "playing") pause(); else resume(); }
    else if (e.key === "Enter" && mode === "asking" && !e.target.closest?.(".nar-bubble button")) begin(idx, true);
    else if (e.key === "ArrowRight" && mode !== "asking") next();
    else if (e.key === "ArrowLeft" && mode !== "asking") prev();
    else if (e.key === "Escape") stop();
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // a page that loses visibility stops talking (speech keeps going in the background otherwise)
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
};

if (window.BGTT) start(window.BGTT); else addEventListener("bgtt:ready", () => start(window.BGTT), { once: true });
})();
