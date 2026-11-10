/* Guitare — PWA hors connexion. Aucune dépendance, aucune étape de build. */
(function () {
  'use strict';

  const { ROOTS, FR, TYPES, CHORDS } = window.CHORD_DATA;
  const PRESET_EX = window.EXERCISE_DATA;
  const KEY = 'guitare-data-v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const todayISO = () => new Date().toISOString();
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return iso; } };
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

  const LEVELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
  const STATUS = { todo: 'À apprendre', doing: 'En cours', done: 'Maîtrisé' };
  const SECTION_NAMES = ['Intro', 'Couplet', 'Pré-refrain', 'Refrain', 'Pont', 'Solo', 'Outro'];
  const KEYS = [];
  ROOTS.forEach((r) => { KEYS.push(r); });
  ROOTS.forEach((r) => { KEYS.push(r + 'm'); });

  /* ================= Données ================= */
  function defaultData() {
    const now = todayISO();
    return {
      version: 1,
      favorites: [],
      customChords: [],
      customExercises: [],
      hiddenExercises: [],
      history: [],
      songs: [{
        id: uid('song'),
        title: 'Chanson exemple (fictive)',
        artist: 'Artiste imaginaire',
        key: 'G', capo: 2, tempo: 92, status: 'doing',
        notes: 'Ceci est un exemple pour montrer le format d\'une fiche. Modifie-le ou supprime-le.\nAstuce : appuie sur un accord pour voir son diagramme.',
        sections: [
          { name: 'Intro', chords: 'G D | Em C' },
          { name: 'Couplet', chords: 'G D | Em C | G D | C D' },
          { name: 'Refrain', chords: 'C G | D Em | C G | D' }
        ],
        strum: { len: 8, slots: ['D', '', 'D', 'U', '', 'U', 'D', 'U'] },
        riffs: [{ name: 'Riff d\'intro', tab: 'e|-----------------|\nB|-----------------|\nG|-----------------|\nD|-----0-2-0-------|\nA|-0-2-------2-0---|\nE|---------------3-|' }],
        createdAt: now, updatedAt: now
      }],
      settings: { bpm: 80, beats: 4, showBarre: false, tuning: 'standard', chromatic: false, a4: 440 },
      lastExport: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      return normalize(JSON.parse(raw));
    } catch (e) { console.warn(e); return defaultData(); }
  }
  function normalize(d) {
    const def = defaultData();
    const out = Object.assign({}, def, d || {});
    ['favorites', 'customChords', 'customExercises', 'hiddenExercises', 'history', 'songs'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    out.settings = Object.assign({}, def.settings, (d && d.settings) || {});
    return out;
  }
  let DATA = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DATA)); }
    catch (e) { toast('Stockage plein ou indisponible : exporte tes données.'); }
  }
  save();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* ================= Accords : outils ================= */
  const ENH = { DB: 'C#', 'D#': 'Eb', GB: 'F#', 'G#': 'Ab', 'A#': 'Bb', CB: 'B', 'E#': 'F', FB: 'E', 'B#': 'C' };
  const FR_ROOT = { DO: 'C', RE: 'D', 'RÉ': 'D', MI: 'E', FA: 'F', SOL: 'G', LA: 'A', SI: 'B' };
  const SUFFIX_ALIAS = { '': '', m: 'm', min: 'm', '-': 'm', maj: '', M: '', '7': '7', maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', m7: 'm7', min7: 'm7', '-7': 'm7', sus2: 'sus2', sus4: 'sus4', sus: 'sus4', add9: 'add9', '5': '5' };

  // Analyse un nom d'accord (anglais ou français) -> { root, suffix }
  function parseChord(str) {
    let s = String(str || '').replace(/\s+/g, '').replace(/♯/g, '#').replace(/♭/g, 'b');
    if (!s) return null;
    s = s.split('/')[0];
    let root = null, rest = '';
    const fr = s.match(/^(do|ré|re|mi|fa|sol|la|si)(#|b)?(.*)$/i);
    if (fr) { root = FR_ROOT[fr[1].toUpperCase()] + (fr[2] || ''); rest = fr[3]; }
    else {
      const en = s.match(/^([A-Ga-g])(#|b)?(.*)$/);
      if (!en) return null;
      root = en[1].toUpperCase() + (en[2] || ''); rest = en[3];
    }
    const up = root.length > 1 ? root[0] + root[1].toUpperCase() : root;
    if (ENH[up]) root = ENH[up];
    rest = rest.trim();
    const suffix = Object.prototype.hasOwnProperty.call(SUFFIX_ALIAS, rest) ? SUFFIX_ALIAS[rest] : rest;
    return { root, suffix, name: root + suffix };
  }

  function allChords() {
    return DATA.customChords.map((c) => Object.assign({ custom: true, shape: 'Mon accord' }, c)).concat(CHORDS);
  }
  function findChords(name) {
    const p = parseChord(name);
    const list = allChords();
    if (!p) return list.filter((c) => c.name.toLowerCase() === String(name).trim().toLowerCase());
    return list.filter((c) => {
      const cp = parseChord(c.name);
      return cp ? cp.name === p.name : c.name === name;
    });
  }

  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const TUNING = [4, 9, 2, 7, 11, 4];
  function chordNotes(ch) {
    const flat = /b/.test(ch.root || '') || ch.root === 'F';
    const names = flat ? FLATS : SHARPS;
    return ch.frets.map((f, i) => (f < 0 ? '×' : names[(TUNING[i] + f) % 12]));
  }

  function findBarre(frets, fingers) {
    const byFret = {};
    frets.forEach((f, i) => { if (f > 0 && fingers[i] === 1) (byFret[f] = byFret[f] || []).push(i); });
    let best = null;
    Object.keys(byFret).forEach((f) => { const a = byFret[f]; if (a.length >= 2 && (!best || a.length > best.strings.length)) best = { fret: +f, strings: a }; });
    if (!best) return null;
    const from = Math.min(...best.strings), to = Math.max(...best.strings);
    // Vérifie qu'aucune corde entre les deux n'est jouée plus bas que la frette du barré
    for (let i = from; i <= to; i++) if (frets[i] >= 0 && frets[i] < best.fret) return null;
    return { fret: best.fret, from, to };
  }

  function chordSVG(ch, opts) {
    opts = opts || {};
    const frets = ch.frets, fingers = ch.fingers || [];
    const played = frets.filter((f) => f > 0);
    const maxF = played.length ? Math.max(...played) : 0;
    const minF = played.length ? Math.min(...played) : 0;
    const base = maxF <= 4 ? 1 : minF;
    const nF = Math.max(5, maxF - base + 1);
    const L = 32, R = 108, T = 30, FH = 22, SP = (R - L) / 5;
    const H = T + nF * FH + 8;
    const line = '#8f887f', dot = '#f5a524', ink = '#1a1203';
    let s = `<svg class="diagram" viewBox="0 0 120 ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagramme ${esc(ch.name)}">`;
    // frettes
    for (let j = 0; j <= nF; j++) s += `<line x1="${L}" x2="${R}" y1="${T + j * FH}" y2="${T + j * FH}" stroke="${line}" stroke-width="1.3"/>`;
    if (base === 1) s += `<rect x="${L - 1}" y="${T - 5}" width="${R - L + 2}" height="6" rx="1.5" fill="#e9e3da"/>`;
    else s += `<text x="${L - 12}" y="${T + FH / 2 + 5}" text-anchor="end" font-size="13" font-weight="700" fill="#cfc8bf">${base}</text>`;
    // cordes
    for (let i = 0; i < 6; i++) s += `<line x1="${L + i * SP}" x2="${L + i * SP}" y1="${T}" y2="${T + nF * FH}" stroke="${line}" stroke-width="${1 + (5 - i) * 0.22}"/>`;
    // à vide / étouffées
    frets.forEach((f, i) => {
      const x = L + i * SP;
      if (f < 0) s += `<path d="M${x - 5} ${T - 19}l10 10M${x + 5} ${T - 19}l-10 10" stroke="#cfc8bf" stroke-width="2" stroke-linecap="round"/>`;
      else if (f === 0) s += `<circle cx="${x}" cy="${T - 14}" r="5" fill="none" stroke="#cfc8bf" stroke-width="2"/>`;
    });
    const barre = findBarre(frets, fingers);
    if (barre) {
      const y = T + (barre.fret - base + 0.5) * FH;
      s += `<rect x="${L + barre.from * SP - 8}" y="${y - 8}" width="${(barre.to - barre.from) * SP + 16}" height="16" rx="8" fill="${dot}"/>`;
      s += `<text x="${L + barre.from * SP}" y="${y + 5}" text-anchor="middle" font-size="12" font-weight="800" fill="${ink}">1</text>`;
    }
    frets.forEach((f, i) => {
      if (f <= 0) return;
      if (barre && f === barre.fret && fingers[i] === 1 && i >= barre.from && i <= barre.to) return;
      const x = L + i * SP, y = T + (f - base + 0.5) * FH;
      s += `<circle cx="${x}" cy="${y}" r="8.5" fill="${dot}"/>`;
      if (fingers[i]) s += `<text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${ink}">${fingers[i]}</text>`;
    });
    if (opts.notes !== false && opts.showNotes) {
      chordNotes(ch).forEach((n, i) => { s += `<text x="${L + i * SP}" y="${H + 12}" text-anchor="middle" font-size="9" fill="#a49d94">${n}</text>`; });
    }
    return s + '</svg>';
  }

  /* ================= Exercices : outils ================= */
  function allExercises() {
    const overrides = {};
    DATA.customExercises.forEach((e) => { overrides[e.id] = e; });
    const list = PRESET_EX.filter((e) => !DATA.hiddenExercises.includes(e.id)).map((e) => overrides[e.id] ? Object.assign({ preset: true, edited: true }, overrides[e.id]) : Object.assign({ preset: true }, e));
    DATA.customExercises.forEach((e) => { if (!PRESET_EX.some((p) => p.id === e.id)) list.push(Object.assign({ custom: true }, e)); });
    return list;
  }
  const getExercise = (id) => allExercises().find((e) => e.id === id);
  const exHistory = (id) => DATA.history.filter((h) => h.exId === id).sort((a, b) => b.date.localeCompare(a.date));

  /* ================= Grattage ================= */
  function strumCounts(len) {
    return len === 16 ? ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a'] : ['1', '&', '2', '&', '3', '&', '4', '&'];
  }
  const ARROW = { D: '↓', U: '↑', X: '×', '': '·' };
  function strumHTML(strum, editable) {
    const len = strum.len === 16 ? 16 : 8;
    const counts = strumCounts(len);
    const slots = (strum.slots || []).concat(Array(len).fill('')).slice(0, len);
    let h = `<div class="strum ${len === 16 ? 's16' : ''}">`;
    slots.forEach((v, i) => {
      const cls = 'arrow ' + (v === 'X' ? 'x' : v ? '' : 'empty');
      h += editable ? `<button type="button" class="${cls}" data-action="strum-cycle" data-i="${i}">${ARROW[v] || '·'}</button>` : `<div class="${cls}">${ARROW[v] || '·'}</div>`;
    });
    counts.forEach((c, i) => { h += `<div class="count ${(len === 8 ? i % 2 === 0 : i % 4 === 0) ? 'on-beat' : ''}">${c}</div>`; });
    return h + '</div>';
  }

  /* ================= Métronome ================= */
  const Audio = {
    ctx: null,
    ensure() {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); }
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      if (this.ctx.state === 'suspended') this.ctx.resume();
      clearTimeout(this.relT);
      return this.ctx;
    },
    // iOS affiche la page comme « en lecture » (écran verrouillé) tant qu'un contexte audio reste ouvert :
    // on le ferme dès que plus rien ne joue.
    busy() { return Metro.running || Guitar.voices.length > 0 || (Timer.running && Timer.target && !Timer.rang); },
    release() {
      clearTimeout(this.relT);
      if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
      Guitar.voices = [];
      try { if (navigator.audioSession) navigator.audioSession.type = 'auto'; } catch (e) {}
      try { if (navigator.mediaSession) { navigator.mediaSession.playbackState = 'none'; navigator.mediaSession.metadata = null; } } catch (e) {}
    },
    releaseSoon(ms) {
      clearTimeout(this.relT);
      this.relT = setTimeout(() => { if (this.busy()) this.releaseSoon(1500); else this.release(); }, ms || 1500);
    },
    beep(time, freq, dur, vol) {
      const ctx = this.ctx; if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol || 0.9, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, time + (dur || 0.05));
      o.connect(g); g.connect(ctx.destination);
      o.start(time); o.stop(time + (dur || 0.05) + 0.02);
    }
  };

  const Metro = {
    running: false, next: 0, beat: 0, timer: null, taps: [],
    get bpm() { return DATA.settings.bpm; },
    set bpm(v) { DATA.settings.bpm = Math.max(30, Math.min(260, Math.round(v))); save(); this.ui(); },
    get beats() { return DATA.settings.beats; },
    set beats(v) { DATA.settings.beats = v; save(); this.ui(true); },
    start() {
      const ctx = Audio.ensure(); if (!ctx) { toast('Audio non disponible'); return; }
      this.running = true; this.beat = 0; this.next = ctx.currentTime + 0.08;
      clearInterval(this.timer);
      this.timer = setInterval(() => this.sched(), 25);
      this.sched(); this.ui();
    },
    stop() { this.running = false; clearInterval(this.timer); this.ui(); $$('.metro .beat').forEach((b) => b.classList.remove('on')); Audio.releaseSoon(1000); },
    toggle() { this.running ? this.stop() : this.start(); },
    sched() {
      const ctx = Audio.ctx;
      while (this.next < ctx.currentTime + 0.12) {
        const b = this.beat, t = this.next;
        const accent = b === 0 && this.beats > 1;
        Audio.beep(t, accent ? 1760 : 1100, 0.05, accent ? 1 : 0.7);
        setTimeout(() => this.flash(b), Math.max(0, (t - ctx.currentTime) * 1000));
        this.next += 60 / this.bpm;
        this.beat = (this.beat + 1) % this.beats;
      }
    },
    flash(b) {
      if (!this.running) return;
      $$('.metro .beat').forEach((el, i) => el.classList.toggle('on', i === b));
    },
    tap() {
      const now = performance.now();
      this.taps = this.taps.filter((t) => now - t < 2500); this.taps.push(now);
      if (this.taps.length >= 2) {
        const d = []; for (let i = 1; i < this.taps.length; i++) d.push(this.taps[i] - this.taps[i - 1]);
        this.bpm = 60000 / (d.reduce((a, b) => a + b, 0) / d.length);
      }
    },
    ui(rebuildBeats) {
      $$('.metro').forEach((m) => {
        const v = $('.bpm-val', m); if (v) v.textContent = this.bpm;
        const r = $('input[type=range]', m); if (r && +r.value !== this.bpm) r.value = this.bpm;
        const p = $('[data-action=metro-toggle]', m); if (p) { p.textContent = this.running ? '■  Stop' : '▶  Démarrer'; p.classList.toggle('primary', !this.running); }
        if (rebuildBeats) $('.beats', m).innerHTML = beatDots();
      });
    },
    html() {
      return `<div class="metro">
        <div class="row" style="justify-content:space-between;align-items:center">
          <span class="label">Métronome</span>
          <select class="input" data-change="metro-beats" style="width:auto;min-height:40px;font-size:15px">
            ${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${n === this.beats ? 'selected' : ''}>${n} temps</option>`).join('')}
          </select>
        </div>
        <div class="bpm"><span class="bpm-val">${this.bpm}</span><small>BPM</small></div>
        <div class="beats">${beatDots()}</div>
        <input type="range" min="30" max="260" value="${this.bpm}" data-input="metro-range" aria-label="Tempo">
        <div class="row" style="justify-content:space-between">
          <button class="round-btn" data-action="metro-add" data-v="-5">−5</button>
          <button class="round-btn" data-action="metro-add" data-v="-1">−</button>
          <button class="round-btn" data-action="metro-add" data-v="1">+</button>
          <button class="round-btn" data-action="metro-add" data-v="5">+5</button>
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn play-btn ${this.running ? '' : 'primary'}" data-action="metro-toggle">${this.running ? '■  Stop' : '▶  Démarrer'}</button>
          <button class="btn" data-action="metro-tap" style="min-height:60px">Tap</button>
        </div>
      </div>`;
    }
  };
  function beatDots() { let h = ''; for (let i = 0; i < Metro.beats; i++) h += `<div class="beat ${i === 0 && Metro.beats > 1 ? 'first' : ''}"></div>`; return h; }

  /* ================= Minuteur de session ================= */
  const Timer = {
    start: 0, acc: 0, running: false, target: 0, iv: null, rang: false,
    elapsed() { return this.acc + (this.running ? Date.now() - this.start : 0); },
    toggle() {
      if (this.running) { this.acc = this.elapsed(); this.running = false; clearInterval(this.iv); Audio.releaseSoon(); }
      else {
        // l'audio n'est préparé (pendant le geste) que s'il y a un objectif à sonner
        if (this.target && !this.rang) Audio.ensure();
        this.start = Date.now(); this.running = true; this.iv = setInterval(() => this.tick(), 250);
      }
      this.ui();
    },
    reset() { this.running = false; clearInterval(this.iv); this.acc = 0; this.rang = false; this.ui(); Audio.releaseSoon(); },
    tick() {
      if (this.target && !this.rang && this.elapsed() >= this.target * 60000) {
        this.rang = true;
        const ctx = Audio.ensure();
        if (ctx) [0, 0.25, 0.5].forEach((d) => Audio.beep(ctx.currentTime + 0.05 + d, 880, 0.18, 0.9));
        Audio.releaseSoon(2000);
        toast(`Session de ${this.target} min terminée 🎉`);
        if (navigator.vibrate) navigator.vibrate(300);
      }
      this.ui();
    },
    fmt(ms) { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); },
    ui() {
      $$('.timer-box').forEach((b) => {
        const el = $('.timer', b);
        el.textContent = this.fmt(this.elapsed());
        el.classList.toggle('done', !!(this.target && this.elapsed() >= this.target * 60000));
        $('[data-action=timer-toggle]', b).textContent = this.running ? 'Pause' : (this.elapsed() ? 'Reprendre' : 'Démarrer');
      });
    },
    html() {
      return `<div class="card timer-box">
        <div class="row" style="justify-content:space-between">
          <span class="label">Minuteur de session</span>
          <select class="input" data-change="timer-target" style="width:auto;min-height:40px;font-size:15px">
            ${[0, 5, 10, 15, 20, 30, 45, 60].map((m) => `<option value="${m}" ${m === this.target ? 'selected' : ''}>${m ? 'Objectif ' + m + ' min' : 'Sans objectif'}</option>`).join('')}
          </select>
        </div>
        <div class="timer">${this.fmt(this.elapsed())}</div>
        <div class="grid-2"><button class="btn primary" data-action="timer-toggle">${this.running ? 'Pause' : 'Démarrer'}</button><button class="btn" data-action="timer-reset">Remettre à zéro</button></div>
      </div>`;
    }
  };

  /* ================= Accordeur ================= */
  const TUNINGS = [
    { id: 'standard', label: 'Standard', notes: [40, 45, 50, 55, 59, 64] },
    { id: 'dropd', label: 'Drop D', notes: [38, 45, 50, 55, 59, 64] },
    { id: 'dadgad', label: 'DADGAD', notes: [38, 45, 50, 55, 57, 62] },
    { id: 'openg', label: 'Open G', notes: [38, 43, 50, 55, 59, 62] },
    { id: 'halfdown', label: '½ ton en dessous', notes: [39, 44, 49, 54, 58, 63], flats: true }
  ];
  const FR_SHARP = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
  const FR_FLAT = ['Do', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
  const noteOf = (midi, flats) => ({ name: (flats ? FLATS : SHARPS)[((midi % 12) + 12) % 12], oct: Math.floor(midi / 12) - 1, fr: (flats ? FR_FLAT : FR_SHARP)[((midi % 12) + 12) % 12] });
  const curTuning = () => TUNINGS.find((t) => t.id === DATA.settings.tuning) || TUNINGS[0];
  const midiOf = (f) => 69 + 12 * Math.log2(f / DATA.settings.a4);
  const freqOf = (m) => DATA.settings.a4 * Math.pow(2, (m - 69) / 12);

  // Détection de hauteur YIN (de Cheveigné & Kawahara, 2002)
  function yin(buf, sr) {
    const tauMax = Math.min(Math.floor(sr / 60), Math.floor(buf.length / 2));
    const tauMin = Math.max(2, Math.floor(sr / 1400));
    const W = Math.min(2048, buf.length - tauMax);
    const d = new Float32Array(tauMax + 1);
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
      d[tau] = s;
    }
    d[0] = 1;
    let run = 0;
    for (let tau = 1; tau <= tauMax; tau++) { run += d[tau]; d[tau] = run ? (d[tau] * tau) / run : 1; }
    let tau = -1;
    for (let t = tauMin; t < tauMax; t++) {
      if (d[t] < 0.15) { while (t + 1 < tauMax && d[t + 1] < d[t]) t++; tau = t; break; }
    }
    if (tau < 1) return -1;
    const x0 = d[tau - 1], x1 = d[tau], x2 = d[tau + 1];
    const den = x0 + x2 - 2 * x1;
    const shift = den ? (x0 - x2) / (2 * den) : 0;
    return sr / (tau + (Math.abs(shift) < 1 ? shift : 0));
  }

  const Tuner = {
    running: false, starting: false, ctx: null, stream: null, analyser: null, buf: null, raf: 0, lastT: 0,
    hist: [], shown: 0, silent: 0, lastKey: null, osc: null, error: '',
    async start(testFreq) {
      if (this.running || this.starting) return;
      this.starting = true; this.error = ''; this.ui();
      const AC = window.AudioContext || window.webkitAudioContext;
      try {
        if (!AC) throw Object.assign(new Error('Web Audio indisponible'), { name: 'NoAudio' });
        let source;
        if (testFreq) {
          this.ctx = new AC();
          this.osc = this.ctx.createOscillator(); this.osc.type = 'sawtooth'; this.osc.frequency.value = testFreq;
          const g = this.ctx.createGain(); g.gain.value = 0.3; this.osc.connect(g); this.osc.start(); source = g;
        } else {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error(''), { name: 'Insecure' });
          try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
          this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
          if (UI.tab !== 'tuner') { this.starting = false; this.stop(); return; } // onglet quitté pendant la demande
          this.ctx = new AC();
          source = this.ctx.createMediaStreamSource(this.stream);
        }
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 4096;
        source.connect(this.analyser);
        this.buf = new Float32Array(this.analyser.fftSize);
        this.hist = []; this.silent = 99; this.lastKey = null; this.shown = 0;
        this.running = true; this.starting = false;
        this.ui(); this.idle();
        clearInterval(this.raf);
        this.raf = setInterval(() => { if (this.running) this.analyse(); }, 33);
      } catch (e) {
        this.starting = false; this.stop();
        this.error = ({
          NotAllowedError: 'Accès au micro refusé. Sur iPhone : Réglages › Safari › Microphone › Autoriser (ou, dans Safari, touche « aA » › Réglages du site web › Microphone). Puis touche à nouveau Démarrer.',
          SecurityError: 'Accès au micro refusé par le navigateur.',
          Insecure: 'Le micro n\'est disponible que sur une connexion sécurisée (https). Ouvre l\'app depuis son adresse Netlify.',
          NotFoundError: 'Aucun micro détecté sur cet appareil.',
          NotReadableError: 'Le micro est déjà utilisé par une autre application.',
          NoAudio: 'Ce navigateur ne gère pas l\'audio nécessaire à l\'accordeur.'
        })[e.name] || ('Impossible de démarrer le micro. ' + (e.message || ''));
        this.ui();
      }
    },
    stop() {
      clearInterval(this.raf);
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      if (this.osc) try { this.osc.stop(); } catch (e) {}
      if (this.ctx) this.ctx.close().catch(() => {});
      this.stream = null; this.ctx = null; this.osc = null; this.analyser = null;
      const was = this.running; this.running = false;
      try { if (navigator.audioSession) navigator.audioSession.type = 'auto'; } catch (e) {}
      if (was) { this.idle(); this.ui(); }
    },
    analyse() {
      this.analyser.getFloatTimeDomainData(this.buf);
      let rms = 0; for (let i = 0; i < this.buf.length; i++) rms += this.buf[i] * this.buf[i];
      rms = Math.sqrt(rms / this.buf.length);
      const f = rms < 0.01 ? -1 : yin(this.buf, this.ctx.sampleRate);
      if (f < 55 || f > 1400) {
        if (++this.silent === 20) { this.hist = []; this.idle(); }
        return;
      }
      this.silent = 0;
      this.hist.push(f); if (this.hist.length > 5) this.hist.shift();
      const fm = this.hist.slice().sort((a, b) => a - b)[Math.floor(this.hist.length / 2)];
      const m = midiOf(fm);
      let target, idx = -1;
      const tun = curTuning();
      if (DATA.settings.chromatic) target = Math.round(m);
      else {
        let best = Infinity;
        tun.notes.forEach((n, i) => { const dd = Math.abs(m - n); if (dd < best) { best = dd; idx = i; } });
        target = tun.notes[idx];
      }
      const cents = 1200 * Math.log2(fm / freqOf(target));
      const key = target + ':' + idx;
      if (key !== this.lastKey) { this.shown = cents; this.lastKey = key; }
      else this.shown += (cents - this.shown) * 0.25;
      this.draw(fm, target, idx, this.shown, !DATA.settings.chromatic && tun.flats);
    },
    draw(f, target, idx, cents, flats) {
      const root = $('#tuner'); if (!root) return;
      const n = noteOf(target, flats);
      const ok = Math.abs(cents) <= 5;
      root.classList.remove('idle'); root.classList.toggle('ok', ok);
      $('#tnNote').textContent = n.name; $('#tnOct').textContent = n.oct; $('#tnFr').textContent = n.fr + ' · ' + freqOf(target).toFixed(1) + ' Hz';
      $('#tnHz').textContent = f.toFixed(1) + ' Hz';
      const c = Math.max(-50, Math.min(50, cents));
      $('#tnNeedle').setAttribute('transform', `rotate(${(c * 1.2).toFixed(2)} 150 160)`);
      const rc = Math.round(cents);
      $('#tnCents').textContent = (rc > 0 ? '+' : rc < 0 ? '−' : '') + Math.abs(rc) + ' cents';
      $('#tnStatus').textContent = ok ? 'Juste ✓' : cents < 0 ? '▲ Trop bas — resserre' : '▼ Trop haut — desserre';
      $$('#tuner [data-i]').forEach((s) => { const on = +s.dataset.i === idx; s.classList.toggle('active', on); s.classList.toggle('ok', on && ok); });
    },
    idle() {
      const root = $('#tuner'); if (!root) return;
      root.classList.add('idle'); root.classList.remove('ok');
      $('#tnNote').textContent = '–'; $('#tnOct').textContent = ''; $('#tnFr').textContent = ' '; $('#tnHz').textContent = '— Hz'; $('#tnCents').textContent = ' ';
      $('#tnNeedle').setAttribute('transform', 'rotate(0 150 160)');
      $('#tnStatus').textContent = this.running ? 'Joue une corde…' : 'Touche Démarrer puis joue une corde';
      $$('#tuner [data-i]').forEach((s) => s.classList.remove('active', 'ok'));
    },
    ui() {
      const b = $('[data-action=tuner-toggle]');
      if (b) { b.textContent = this.starting ? 'Ouverture du micro…' : this.running ? '■  Arrêter' : '🎤  Démarrer'; b.classList.toggle('primary', !this.running); }
      const e = $('#tnError'); if (e) { e.hidden = !this.error; e.textContent = this.error; }
    },
    // Tête de guitare 3+3 vue de face : basses à gauche (Mi grave en haut), aiguës à droite (Mi aigu en haut)
    headstock(tun) {
      const postY = [62, 116, 170, 170, 116, 62];          // par corde, de la 6e (index 0) à la 1re (index 5)
      const postX = [122, 122, 122, 178, 178, 178];
      const nutX = (i) => 125 + i * 10;
      const NUT = 204;
      let s = '<svg class="tn-head" viewBox="0 0 300 236" aria-label="Tête de guitare">';
      s += '<defs><linearGradient id="wood" x1="0" x2="1"><stop offset="0" stop-color="#2a1c11"/><stop offset=".5" stop-color="#4a3220"/><stop offset="1" stop-color="#2a1c11"/></linearGradient></defs>';
      // axes des mécaniques (derrière la tête)
      for (let i = 0; i < 6; i++) {
        const left = i < 3, y = postY[i];
        s += `<rect x="${left ? 70 : 186}" y="${y - 3}" width="44" height="6" rx="2" fill="#8d877f"/>`;
      }
      // manche sous le sillet
      s += `<rect x="116" y="${NUT}" width="68" height="32" fill="#3a2717"/><line x1="116" x2="184" y1="${NUT + 24}" y2="${NUT + 24}" stroke="#a9a196" stroke-width="2"/>`;
      // tête
      s += `<path d="M116 ${NUT + 2} L116 ${NUT} C110 150 96 96 96 52 C96 22 122 8 150 16 C178 8 204 22 204 52 C204 96 190 150 184 ${NUT} L184 ${NUT + 2} Z" fill="url(#wood)" stroke="#5c412b" stroke-width="1.5"/>`;
      // cordes : du sillet vers chaque axe
      for (let i = 0; i < 6; i++) {
        s += `<line class="tn-str" data-i="${i}" x1="${nutX(i)}" y1="${NUT + 32}" x2="${nutX(i)}" y2="${NUT}" stroke-width="${(2.4 - i * 0.3).toFixed(1)}"/>`;
        s += `<line class="tn-str" data-i="${i}" x1="${nutX(i)}" y1="${NUT}" x2="${postX[i]}" y2="${postY[i]}" stroke-width="${(2.4 - i * 0.3).toFixed(1)}"/>`;
      }
      // sillet
      s += `<rect x="114" y="${NUT - 3}" width="72" height="7" rx="2" fill="#efe8dc"/>`;
      // axes visibles
      for (let i = 0; i < 6; i++) s += `<circle cx="${postX[i]}" cy="${postY[i]}" r="6" fill="#d8d2c8" stroke="#6f6a63" stroke-width="1.5"/>`;
      // boutons des mécaniques avec la note
      tun.notes.forEach((m, i) => {
        const n = noteOf(m, tun.flats), left = i < 3, cx = left ? 48 : 252, y = postY[i];
        s += `<g class="tn-peg" data-i="${i}">
          <rect class="peg" x="${cx - 30}" y="${y - 21}" width="60" height="42" rx="15"/>
          <text x="${cx - 3}" y="${y + 8}" text-anchor="middle" font-size="22" font-weight="800">${n.name}<tspan font-size="12" dy="3">${n.oct}</tspan></text>
          <text class="num" x="${left ? cx - 40 : cx + 40}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700">${6 - i}</text>
        </g>`;
      });
      return s + '</svg>';
    },
    gauge() {
      let s = '<svg class="tn-gauge" viewBox="0 0 300 180" aria-hidden="true">';
      const P = (c, r) => { const a = (c * 1.2 * Math.PI) / 180; return [150 + r * Math.sin(a), 160 - r * Math.cos(a)]; };
      const arc = (c1, c2, r) => { const [x1, y1] = P(c1, r), [x2, y2] = P(c2, r); return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
      s += `<path d="${arc(-50, 50, 128)}" fill="none" stroke="#2c2c2c" stroke-width="16" stroke-linecap="round"/>`;
      s += `<path d="${arc(-5, 5, 128)}" fill="none" stroke="#4cc38a" stroke-width="16"/>`;
      for (let c = -50; c <= 50; c += 5) {
        const big = c % 25 === 0, [x1, y1] = P(c, big ? 104 : 110), [x2, y2] = P(c, 116);
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${big ? '#9a938a' : '#555'}" stroke-width="${big ? 3 : 2}" stroke-linecap="round"/>`;
      }
      [[-50, '−50'], [-25, '−25'], [0, '0'], [25, '+25'], [50, '+50']].forEach(([c, l]) => { const [x, y] = P(c, 90); s += `<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="#8a837a">${l}</text>`; });
      s += `<g id="tnNeedle" transform="rotate(0 150 160)"><line class="tn-needle" x1="150" y1="160" x2="150" y2="34" stroke-width="5" stroke-linecap="round"/></g><circle class="tn-pivot" cx="150" cy="160" r="9"/>`;
      return s + '</svg>';
    }
  };

  /* ================= Son de guitare classique (synthèse Karplus-Strong) ================= */
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  const Guitar = {
    cache: new Map(), chain: null, chainCtx: null, voices: [],
    // Une corde pincée : bruit doux filtré qui circule dans une ligne à retard amortie
    pluck(ctx, freq) {
      const key = ctx.sampleRate + ':' + freq.toFixed(2);
      if (this.cache.has(key)) return this.cache.get(key);
      const sr = ctx.sampleRate, P = sr / freq, D = P - 0.5; // le filtre moyenneur ajoute ½ échantillon
      // les filtres de la boucle ajoutent de l'amortissement : on vise large pour garder une tenue naturelle
      const T60 = Math.max(2.5, Math.min(7, 7.5 - freq / 80));
      const len = Math.floor(sr * Math.min(4, T60 * 0.7 + 0.5));
      const g = Math.pow(0.001, 1 / (freq * T60));
      const out = new Float32Array(len);
      // excitation : bruit adouci (attaque au doigt, corde nylon) + position de pincement
      const n0 = Math.ceil(P), exc = new Float32Array(n0);
      let e = 0;
      for (let i = 0; i < n0; i++) { e += 0.45 * ((Math.random() * 2 - 1) - e); exc[i] = e; }
      const pos = Math.max(1, Math.round(P * 0.18));
      const read = (t) => { if (t < 0) return 0; const i = Math.floor(t), fr = t - i; return out[i] * (1 - fr) + (i + 1 < len ? out[i + 1] : 0) * fr; };
      for (let n = 0; n < len; n++) {
        const x = n < n0 ? exc[n] - 0.85 * (n - pos >= 0 ? exc[n - pos] : 0) : 0;
        out[n] = x + g * 0.5 * (read(n - D) + read(n - D - 1));
      }
      let peak = 0; for (let n = 0; n < len; n++) peak = Math.max(peak, Math.abs(out[n]));
      const fade = Math.floor(sr * 0.08);
      for (let n = 0; n < len; n++) { out[n] = (out[n] / (peak || 1)) * 0.5; if (n > len - fade) out[n] *= (len - n) / fade; }
      const buf = ctx.createBuffer(1, len, sr);
      buf.getChannelData(0).set(out);
      this.cache.set(key, buf);
      return buf;
    },
    // Caisse de résonance : graves arrondis, aigus adoucis
    output(ctx) {
      if (this.chainCtx === ctx) return this.chain;
      const input = ctx.createGain(); input.gain.value = 0.9;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3600; lp.Q.value = 0.4;
      const b1 = ctx.createBiquadFilter(); b1.type = 'peaking'; b1.frequency.value = 105; b1.Q.value = 1.2; b1.gain.value = 5;
      const b2 = ctx.createBiquadFilter(); b2.type = 'peaking'; b2.frequency.value = 230; b2.Q.value = 1.4; b2.gain.value = 3;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      input.connect(lp); lp.connect(b1); b1.connect(b2); b2.connect(comp); comp.connect(ctx.destination);
      this.chain = input; this.chainCtx = ctx;
      return input;
    },
    stop(ctx) {
      const now = ctx.currentTime;
      this.voices.forEach(({ src, gain }) => { try { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, 0.03); src.stop(now + 0.2); } catch (e) {} });
      this.voices = [];
    },
    play(ch, arpeggio) {
      const ctx = Audio.ensure(); if (!ctx) { toast('Audio non disponible'); return; }
      this.stop(ctx);
      const dest = this.output(ctx);
      // on prépare tous les sons avant de programmer le grattage (sinon la 1re écoute serait décalée)
      const bufs = ch.frets.map((f, i) => (f < 0 ? null : this.pluck(ctx, freqOf(OPEN_MIDI[i] + f))));
      const t0 = ctx.currentTime + 0.05;
      let k = 0;
      ch.frets.forEach((f, i) => {
        if (f < 0) return;
        const src = ctx.createBufferSource(); src.buffer = bufs[i];
        const gain = ctx.createGain(); gain.gain.value = 0.5 + Math.random() * 0.12 - (arpeggio ? 0 : i * 0.015);
        src.connect(gain); gain.connect(dest);
        src.start(t0 + k * (arpeggio ? 0.3 : 0.032 + Math.random() * 0.01));
        src.onended = () => { this.voices = this.voices.filter((v) => v.src !== src); };
        this.voices.push({ src, gain });
        k++;
      });
      Audio.releaseSoon(1000); // se refermera après la dernière note (busy() tant que des voix sonnent)
    }
  };

  /* ================= État de navigation ================= */
  const UI = {
    tab: 'chords',
    stacks: { chords: [{ v: 'chords' }], exercises: [{ v: 'exercises' }], songs: [{ v: 'songs' }], tuner: [{ v: 'tuner' }] },
    chordFilter: 'all', chordQuery: '',
    exLevel: 'all', exQuery: '',
    songStatus: 'all', songQuery: '', songArtist: '', songKey: '', songSort: 'title'
  };
  const stack = () => UI.stacks[UI.tab];
  const top = () => stack()[stack().length - 1];
  function push(v) { top().scroll = $('#view').scrollTop; stack().push(v); render(true); }
  function pop() { if (stack().length > 1) { stack().pop(); render(false); } }
  function replaceTop(v) { stack()[stack().length - 1] = v; render(true); }

  /* ================= Vues ================= */
  const searchHTML = (val, ph) => `<div class="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input type="search" id="q" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
      <button class="clear" data-action="clear-search" aria-label="Effacer" ${val ? '' : 'hidden'}>×</button>
    </div>`;

  const VIEWS = {};

  /* ----- Accords ----- */
  VIEWS.chords = {
    title: () => 'Accords',
    actions: () => `<button class="icon-btn" data-action="new-chord" aria-label="Ajouter un accord" style="font-size:30px;font-weight:400">+</button>`,
    render() {
      const chips = [['all', 'Tous'], ['fav', '★ Favoris'], ['mine', 'Mes accords']].concat(TYPES.map((t) => [t.id, t.label]));
      return searchHTML(UI.chordQuery, 'Rechercher : F#m, Sol7, sus4…') +
        `<div class="chips" id="chordChips">${chips.map(([id, l]) => `<button class="chip ${UI.chordFilter === id ? 'active' : ''}" data-action="chord-filter" data-id="${id}">${l}</button>`).join('')}</div>
        <label class="switch-row"><span>Afficher les accords barrés</span>
          <input type="checkbox" class="switch" data-change="toggle-barre" ${DATA.settings.showBarre ? 'checked' : ''}></label>
        <div id="results"></div>`;
    },
    results() {
      let list = allChords();
      const f = UI.chordFilter;
      if (f === 'fav') list = list.filter((c) => DATA.favorites.includes(c.id));
      else if (f === 'mine') list = list.filter((c) => c.custom);
      else if (f !== 'all') list = list.filter((c) => c.type === f);
      const q = UI.chordQuery.trim();
      if (q) {
        const p = parseChord(q);
        const qs = p ? p.suffix.toLowerCase() : '';
        const knownSuffix = p && (TYPES.some((t) => t.suffix.toLowerCase().startsWith(qs)) || DATA.customChords.some((c) => c.name.toLowerCase().startsWith(q.toLowerCase())));
        if (p && knownSuffix) {
          list = list.filter((c) => {
            const cp = parseChord(c.name); if (!cp || cp.root !== p.root) return false;
            const cs = cp.suffix.toLowerCase();
            if (!cs.startsWith(qs)) return false;
            if (qs.startsWith('m') && !qs.startsWith('ma') && cs.startsWith('maj')) return false;
            return true;
          });
          list.sort((a, b) => (parseChord(b.name).suffix === p.suffix) - (parseChord(a.name).suffix === p.suffix));
        } else {
          const ql = q.toLowerCase();
          list = list.filter((c) => c.name.toLowerCase().includes(ql) || (TYPES.find((t) => t.id === c.type) || { label: '' }).label.toLowerCase().includes(ql));
        }
      }
      let hiddenBarre = 0;
      if (!DATA.settings.showBarre && f !== 'fav' && f !== 'mine') {
        const before = list.length;
        list = list.filter((c) => !/^Barré/.test(c.shape || ''));
        hiddenBarre = before - list.length;
      }
      const hint = hiddenBarre ? `<button class="hint-btn" data-action="show-barre">+ ${hiddenBarre} accord${hiddenBarre > 1 ? 's' : ''} barré${hiddenBarre > 1 ? 's' : ''} masqué${hiddenBarre > 1 ? 's' : ''} · Afficher</button>` : '';
      if (!list.length) return `<div class="empty">${f === 'fav' ? 'Aucun favori pour l\'instant.<br>Touche ☆ sur un accord pour l\'ajouter.' : f === 'mine' ? 'Tu n\'as pas encore créé d\'accord.<br>Touche + en haut à droite.' : hiddenBarre ? 'Aucun accord ouvert pour cette recherche.' : 'Aucun accord trouvé.'}</div>${hint}`;
      return `<p class="muted small" style="margin:0 2px 8px">${list.length} diagramme${list.length > 1 ? 's' : ''}</p>${hiddenBarre && q ? hint : ''}<div class="chord-grid">` + list.map((c) => {
        const fav = DATA.favorites.includes(c.id);
        return `<div class="chord-card" data-action="open-chord" data-id="${esc(c.id)}" role="button" tabindex="0">
          <button class="fav-btn ${fav ? 'on' : ''}" data-action="toggle-fav" data-id="${esc(c.id)}" aria-label="Favori">${fav ? '★' : '☆'}</button>
          <div class="name">${esc(c.name)}</div>
          <div class="shape">${esc(c.note || c.shape || '')}</div>
          ${chordSVG(c)}
        </div>`;
      }).join('') + '</div>';
    }
  };

  VIEWS.chordEdit = {
    title: (v) => v.id ? 'Modifier l\'accord' : 'Nouvel accord',
    actions: () => `<button class="icon-btn" data-action="save-chord">Enregistrer</button>`,
    render(v) {
      const d = v.draft;
      const fretOpts = (sel) => `<option value="-1" ${sel === -1 ? 'selected' : ''}>×</option>` + Array.from({ length: 16 }, (_, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${i}</option>`).join('');
      const fingerOpts = (sel) => `<option value="0" ${!sel ? 'selected' : ''}>–</option>` + [1, 2, 3, 4].map((i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${i}</option>`).join('');
      return `<div class="field"><label>Nom de l'accord</label><input class="input" data-bind="name" value="${esc(d.name)}" placeholder="ex. Cadd9, F#m7b5…"></div>
        <div class="field"><label>Type (pour les filtres)</label><select class="input" data-bind="type">${TYPES.map((t) => `<option value="${t.id}" ${d.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}<option value="other" ${d.type === 'other' ? 'selected' : ''}>Autre</option></select></div>
        <div class="label" style="margin-bottom:8px">Cordes (de la plus grave à la plus aiguë)</div>
        <div class="string-editor">
          <div></div>${['E', 'A', 'D', 'G', 'B', 'e'].map((s) => `<div class="hdr">${s}</div>`).join('')}
          <div class="lbl">Frette</div>${d.frets.map((f, i) => `<select class="input" data-arr="frets" data-i="${i}">${fretOpts(f)}</select>`).join('')}
          <div class="lbl">Doigt</div>${d.fingers.map((f, i) => `<select class="input" data-arr="fingers" data-i="${i}">${fingerOpts(f)}</select>`).join('')}
        </div>
        <p class="muted small">× = corde étouffée, 0 = à vide. Doigts : 1 index, 2 majeur, 3 annulaire, 4 auriculaire. Mets le doigt 1 sur plusieurs cordes à la même frette pour dessiner un barré.</p>
        <div class="chord-big" id="preview">${chordSVG(d, { showNotes: true })}<div class="notes-line">${chordNotes(d).join(' ')}</div></div>
        ${v.id ? `<button class="btn danger block" style="margin-top:20px" data-action="delete-chord">Supprimer cet accord</button>` : ''}`;
    },
    refresh(v) { $('#preview').innerHTML = chordSVG(v.draft, { showNotes: true }) + `<div class="notes-line">${chordNotes(v.draft).join(' ')}</div>`; }
  };

  /* ----- Exercices ----- */
  VIEWS.exercises = {
    title: () => 'Exercices',
    actions: () => `<button class="icon-btn" data-action="open-metro" aria-label="Métronome"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 21h8l-1.6-15a2.4 2.4 0 00-4.8 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 17l4-11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      <button class="icon-btn" data-action="new-exercise" aria-label="Ajouter un exercice" style="font-size:30px;font-weight:400">+</button>`,
    render() {
      const chips = [['all', 'Tous'], ['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['avance', 'Avancé'], ['mine', 'Mes exercices']];
      return searchHTML(UI.exQuery, 'Rechercher un exercice…') +
        `<div class="chips">${chips.map(([id, l]) => `<button class="chip ${UI.exLevel === id ? 'active' : ''}" data-action="ex-filter" data-id="${id}">${l}</button>`).join('')}</div>
        <div id="results"></div>`;
    },
    results() {
      let list = allExercises();
      if (UI.exLevel === 'mine') list = list.filter((e) => e.custom || e.edited);
      else if (UI.exLevel !== 'all') list = list.filter((e) => e.level === UI.exLevel);
      const q = UI.exQuery.trim().toLowerCase();
      if (q) list = list.filter((e) => [e.title, e.category, e.description, LEVELS[e.level]].join(' ').toLowerCase().includes(q));
      if (!list.length) return '<div class="empty">Aucun exercice trouvé.</div>';
      const groups = {};
      list.forEach((e) => { const c = e.category || 'Mes exercices'; (groups[c] = groups[c] || []).push(e); });
      return Object.keys(groups).map((cat) => `<div class="section-title">${esc(cat)}</div><div class="list">` + groups[cat].map((e) => {
        const h = exHistory(e.id);
        const today = h.some((x) => sameDay(x.date, Date.now()));
        return `<button class="list-item" data-action="open-exercise" data-id="${esc(e.id)}">
          <div class="grow"><div class="t">${today ? '<span class="check">✓</span> ' : ''}${esc(e.title)}</div>
          <div class="s row wrap" style="gap:6px;margin-top:4px"><span class="badge ${e.level}">${LEVELS[e.level] || ''}</span>${h.length ? `<span>Dernière fois : ${fmtDate(h[0].date)}${h[0].bpm ? ' · ' + h[0].bpm + ' BPM' : ''}</span>` : ''}</div></div>
          <span class="chev">›</span></button>`;
      }).join('') + '</div>').join('');
    }
  };

  VIEWS.exercise = {
    title: () => 'Exercice',
    actions: (v) => `<button class="icon-btn" data-action="edit-exercise" data-id="${esc(v.id)}">Modifier</button>`,
    render(v) {
      const e = getExercise(v.id);
      if (!e) return '<div class="empty">Exercice introuvable.</div>';
      if (e.bpm && !v.bpmSet) { v.bpmSet = true; if (!Metro.running) DATA.settings.bpm = e.bpm; }
      const h = exHistory(e.id);
      const best = h.reduce((m, x) => Math.max(m, x.bpm || 0), 0);
      return `<div class="song-head"><div class="title">${esc(e.title)}</div>
          <div class="row wrap" style="gap:6px;margin-top:8px"><span class="badge ${e.level}">${LEVELS[e.level] || ''}</span><span class="badge">${esc(e.category || '')}</span>${e.bpm ? `<span class="badge accent">Tempo conseillé : ${e.bpm} BPM</span>` : ''}</div></div>
        <p class="desc">${esc(e.description || '').replace(/\n/g, '<br>')}</p>
        ${e.chords && e.chords.length ? `<div class="section-title">Accords</div><div class="chord-grid">${e.chords.map((n) => { const c = findChords(n)[0]; return c ? `<div class="chord-card" data-action="show-chord" data-name="${esc(n)}" role="button"><div class="name">${esc(n)}</div>${chordSVG(c)}</div>` : `<div class="chord-card"><div class="name">${esc(n)}</div><div class="muted small">Inconnu</div></div>`; }).join('')}</div>` : ''}
        ${e.strum && e.strum.some((x) => x) ? `<div class="section-title">Rythme</div><div class="card">${strumHTML({ len: e.strum.length, slots: e.strum })}</div>` : ''}
        ${e.tab ? `<div class="section-title">Tablature</div><div class="tab-block">${esc(e.tab)}</div>` : ''}
        <div class="section-title">Pratique</div>
        ${Metro.html()}
        <div style="height:10px"></div>
        ${Timer.html()}
        <button class="btn primary block" style="margin-top:14px;min-height:60px;font-size:19px" data-action="mark-done" data-id="${esc(e.id)}">✓ Marquer comme fait</button>
        <div class="section-title">Historique ${best ? `<span class="badge accent" style="margin-left:6px">Record : ${best} BPM</span>` : ''}</div>
        <div class="card">${h.length ? h.slice(0, 30).map((x) => `<div class="history-row"><span>${fmtDate(x.date)}</span><span>${x.bpm ? x.bpm + ' BPM' : ''}${x.minutes ? ' · ' + x.minutes + ' min' : ''} <button class="icon-btn" style="height:28px;min-width:28px;color:#777" data-action="del-history" data-id="${esc(x.id)}" aria-label="Supprimer">×</button></span></div>`).join('') : '<div class="muted">Pas encore fait. Lance le métronome et c\'est parti !</div>'}</div>`;
    }
  };

  VIEWS.exerciseEdit = {
    title: (v) => v.id ? 'Modifier l\'exercice' : 'Nouvel exercice',
    actions: () => `<button class="icon-btn" data-action="save-exercise">Enregistrer</button>`,
    render(v) {
      const d = v.draft;
      const cats = Array.from(new Set(allExercises().map((e) => e.category).filter(Boolean)));
      return `<div class="field"><label>Titre</label><input class="input" data-bind="title" value="${esc(d.title)}" placeholder="ex. Changements D – A"></div>
        <div class="field"><label>Catégorie</label><input class="input" data-bind="category" list="cats" value="${esc(d.category)}"><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="grid-2">
          <div class="field"><label>Niveau</label><select class="input" data-bind="level">${Object.entries(LEVELS).map(([k, l]) => `<option value="${k}" ${d.level === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label>Tempo conseillé (BPM)</label><input class="input" type="number" inputmode="numeric" data-bind="bpm" value="${esc(d.bpm)}"></div>
        </div>
        <div class="field"><label>Description</label><textarea class="input" data-bind="description">${esc(d.description)}</textarea></div>
        <div class="field"><label>Accords à afficher (séparés par des espaces)</label><input class="input" data-bind="chordsText" value="${esc(d.chordsText)}" placeholder="ex. Am F C G" autocapitalize="off"></div>
        <div class="field"><label>Rythme de grattage (touche une case pour changer : ↓ ↑ × ·)</label><div class="card">${strumHTML({ len: 8, slots: d.strum }, true)}</div></div>
        <div class="field"><label>Tablature (facultatif)</label><textarea class="input mono" data-bind="tab" placeholder="e|----|">${esc(d.tab)}</textarea>
          <button class="btn sm" data-action="tab-template" data-target="tab" style="align-self:flex-start">Insérer un modèle 6 cordes</button></div>
        ${v.id ? `<button class="btn danger block" style="margin-top:10px" data-action="delete-exercise">${d.isPreset ? 'Masquer cet exercice' : 'Supprimer cet exercice'}</button>` : ''}
        ${v.id && d.isPreset && DATA.customExercises.some((e) => e.id === v.id) ? `<button class="btn block" style="margin-top:10px" data-action="restore-exercise">Restaurer la version d'origine</button>` : ''}`;
    }
  };

  /* ----- Morceaux ----- */
  VIEWS.songs = {
    title: () => 'Morceaux',
    render() {
      const artists = Array.from(new Set(DATA.songs.map((s) => (s.artist || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));
      const keys = Array.from(new Set(DATA.songs.map((s) => s.key).filter(Boolean))).sort();
      const chips = [['all', 'Tous'], ['todo', STATUS.todo], ['doing', STATUS.doing], ['done', STATUS.done]];
      return searchHTML(UI.songQuery, 'Titre, artiste, notes…') +
        `<div class="chips">${chips.map(([id, l]) => `<button class="chip ${UI.songStatus === id ? 'active' : ''}" data-action="song-filter" data-id="${id}">${l}</button>`).join('')}</div>
        <div class="sort-row">
          <select class="input" data-change="song-artist"><option value="">Tous les artistes</option>${artists.map((a) => `<option ${UI.songArtist === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
          <select class="input" data-change="song-key"><option value="">Toutes tonalités</option>${keys.map((k) => `<option ${UI.songKey === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
        </div>
        <div class="sort-row" style="grid-template-columns:1fr">
          <select class="input" data-change="song-sort">${[['title', 'Trier par titre'], ['artist', 'Trier par artiste'], ['status', 'Trier par statut'], ['key', 'Trier par tonalité'], ['recent', 'Modifiés récemment']].map(([k, l]) => `<option value="${k}" ${UI.songSort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div id="results"></div>
        <button class="fab" data-action="new-song" aria-label="Ajouter un morceau">+</button>`;
    },
    results() {
      let list = DATA.songs.slice();
      if (UI.songStatus !== 'all') list = list.filter((s) => s.status === UI.songStatus);
      if (UI.songArtist) list = list.filter((s) => (s.artist || '').trim() === UI.songArtist);
      if (UI.songKey) list = list.filter((s) => s.key === UI.songKey);
      const q = UI.songQuery.trim().toLowerCase();
      if (q) list = list.filter((s) => [s.title, s.artist, s.notes, s.key].join(' ').toLowerCase().includes(q));
      const so = { todo: 0, doing: 1, done: 2 };
      const cmp = {
        title: (a, b) => (a.title || '').localeCompare(b.title || '', 'fr'),
        artist: (a, b) => (a.artist || '').localeCompare(b.artist || '', 'fr') || (a.title || '').localeCompare(b.title || '', 'fr'),
        status: (a, b) => so[a.status] - so[b.status] || (a.title || '').localeCompare(b.title || '', 'fr'),
        key: (a, b) => (a.key || '').localeCompare(b.key || '') || (a.title || '').localeCompare(b.title || '', 'fr'),
        recent: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')
      }[UI.songSort];
      list.sort(cmp);
      if (!DATA.songs.length) return '<div class="empty">Ta banque est vide.<br>Touche + pour ajouter ton premier morceau.</div>';
      if (!list.length) return '<div class="empty">Aucun morceau ne correspond.</div>';
      return '<div class="list">' + list.map((s) => `<button class="list-item" data-action="open-song" data-id="${esc(s.id)}">
          <div class="grow"><div class="t">${esc(s.title || 'Sans titre')}</div>
          <div class="s">${esc(s.artist || '—')}${s.key ? ' · ' + esc(s.key) : ''}${+s.capo ? ' · capo ' + esc(s.capo) : ''}</div></div>
          <span class="badge ${s.status}">${STATUS[s.status] || ''}</span><span class="chev">›</span></button>`).join('') + '</div>';
    }
  };

  function chordLineHTML(text) {
    const bars = String(text || '').split('|').map((b) => b.trim().split(/\s+/).filter(Boolean)).filter((b) => b.length);
    return `<div class="chord-line">` + bars.map((b) => `<div class="bar">${b.map((t) => `<button class="chord-chip" data-action="show-chord" data-name="${esc(t)}">${esc(t)}</button>`).join('')}</div>`).join('') + '</div>';
  }

  VIEWS.song = {
    title: () => 'Morceau',
    actions: (v) => `<button class="icon-btn" data-action="edit-song" data-id="${esc(v.id)}">Modifier</button>`,
    render(v) {
      const s = DATA.songs.find((x) => x.id === v.id);
      if (!s) return '<div class="empty">Morceau introuvable.</div>';
      const hasStrum = s.strum && (s.strum.slots || []).some((x) => x);
      return `<div class="song-head"><div class="title">${esc(s.title || 'Sans titre')}</div><div class="artist">${esc(s.artist || '')}</div></div>
        <div class="meta-grid">
          <div class="meta"><div class="k">Tonalité</div><div class="v">${esc(s.key || '—')}</div></div>
          <div class="meta"><div class="k">Capo</div><div class="v">${+s.capo ? esc(s.capo) : '—'}</div></div>
          <div class="meta"><div class="k">Tempo</div><div class="v">${s.tempo ? esc(s.tempo) : '—'}</div></div>
        </div>
        <div class="section-title">Statut</div>
        <div class="status-seg">${Object.entries(STATUS).map(([k, l]) => `<button class="${s.status === k ? 'active' : ''}" data-action="song-status" data-id="${esc(s.id)}" data-s="${k}">${l}</button>`).join('')}</div>
        ${(s.sections || []).length ? `<div class="section-title">Grille d'accords</div>` + s.sections.map((sec) => `<div class="card" style="margin-bottom:10px"><div class="section-name">${esc(sec.name || 'Section')}</div>${chordLineHTML(sec.chords)}</div>`).join('') : ''}
        ${hasStrum ? `<div class="section-title">Rythme de grattage</div><div class="card">${strumHTML(s.strum)}</div>` : ''}
        ${(s.riffs || []).filter((r) => r.tab).map((r) => `<div class="section-title">${esc(r.name || 'Riff')}</div><div class="tab-block">${esc(r.tab)}</div>`).join('')}
        ${s.tempo ? `<button class="btn block" style="margin-top:18px" data-action="song-metro" data-bpm="${esc(s.tempo)}">Métronome à ${esc(s.tempo)} BPM</button>` : ''}
        ${s.notes ? `<div class="section-title">Notes</div><div class="card desc" style="font-size:17px">${esc(s.notes).replace(/\n/g, '<br>')}</div>` : ''}
        <p class="muted small center" style="margin-top:24px">Modifié le ${fmtDate(s.updatedAt)}</p>`;
    }
  };

  VIEWS.songEdit = {
    title: (v) => v.id ? 'Modifier le morceau' : 'Nouveau morceau',
    actions: () => `<button class="icon-btn" data-action="save-song">Enregistrer</button>`,
    render(v) {
      const d = v.draft;
      return `<div class="field"><label>Titre</label><input class="input" data-bind="title" value="${esc(d.title)}" placeholder="Titre du morceau"></div>
        <div class="field"><label>Artiste</label><input class="input" data-bind="artist" value="${esc(d.artist)}" list="artists"><datalist id="artists">${Array.from(new Set(DATA.songs.map((s) => s.artist).filter(Boolean))).map((a) => `<option value="${esc(a)}">`).join('')}</datalist></div>
        <div class="grid-3">
          <div class="field"><label>Tonalité</label><select class="input" data-bind="key"><option value="">—</option>${KEYS.map((k) => `<option ${d.key === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
          <div class="field"><label>Capo</label><select class="input" data-bind="capo">${Array.from({ length: 13 }, (_, i) => `<option value="${i}" ${+d.capo === i ? 'selected' : ''}>${i || '—'}</option>`).join('')}</select></div>
          <div class="field"><label>Tempo</label><input class="input" type="number" inputmode="numeric" data-bind="tempo" value="${esc(d.tempo)}" placeholder="BPM"></div>
        </div>
        <div class="field"><label>Statut</label><div class="status-seg">${Object.entries(STATUS).map(([k, l]) => `<button type="button" class="${d.status === k ? 'active' : ''}" data-action="draft-status" data-s="${k}">${l}</button>`).join('')}</div></div>

        <div class="section-title">Grille d'accords</div>
        <p class="muted small" style="margin-top:-4px">Sépare les accords par des espaces et les mesures par « | ». Ex. : <code>Am F | C G</code></p>
        ${d.sections.map((sec, i) => `<div class="edit-block">
            <div class="row"><input class="input grow" data-sec="${i}" data-f="name" value="${esc(sec.name)}" list="secnames" placeholder="Nom de la section"><button class="del-x" data-action="del-section" data-i="${i}" aria-label="Supprimer la section">×</button></div>
            <input class="input" data-sec="${i}" data-f="chords" value="${esc(sec.chords)}" placeholder="G D | Em C" autocapitalize="off" autocorrect="off" spellcheck="false">
          </div>`).join('')}
        <datalist id="secnames">${SECTION_NAMES.map((n) => `<option value="${n}">`).join('')}</datalist>
        <button class="btn block" data-action="add-section">+ Ajouter une section</button>

        <div class="section-title">Rythme de grattage</div>
        <div class="row" style="margin-bottom:8px"><span class="muted small grow">Touche une case : ↓ → ↑ → × (étouffé) → ·</span>
          <select class="input" data-change="strum-len" style="width:auto;min-height:40px;font-size:15px"><option value="8" ${d.strum.len !== 16 ? 'selected' : ''}>Croches</option><option value="16" ${d.strum.len === 16 ? 'selected' : ''}>Doubles</option></select></div>
        <div class="card">${strumHTML(d.strum, true)}</div>

        <div class="section-title">Riffs (tablature)</div>
        ${d.riffs.map((r, i) => `<div class="edit-block">
            <div class="row"><input class="input grow" data-riff="${i}" data-f="name" value="${esc(r.name)}" placeholder="Nom du riff"><button class="del-x" data-action="del-riff" data-i="${i}" aria-label="Supprimer le riff">×</button></div>
            <textarea class="input mono" data-riff="${i}" data-f="tab" spellcheck="false" autocapitalize="off" autocorrect="off">${esc(r.tab)}</textarea>
          </div>`).join('')}
        <button class="btn block" data-action="add-riff">+ Ajouter un riff</button>

        <div class="section-title">Notes</div>
        <textarea class="input" data-bind="notes" placeholder="Structure, astuces, paroles à retenir…">${esc(d.notes)}</textarea>
        ${v.id ? `<button class="btn danger block" style="margin-top:24px" data-action="delete-song">Supprimer ce morceau</button>` : ''}`;
    }
  };

  /* ----- Accordeur ----- */
  VIEWS.tuner = {
    title: () => 'Accordeur',
    render() {
      const tun = curTuning(), chrom = !!DATA.settings.chromatic;
      return `<div id="tuner" class="tuner idle">
          <div class="tn-display">
            <div class="tn-note"><span id="tnNote">–</span><sub id="tnOct"></sub></div>
            <div id="tnFr" class="tn-fr">&nbsp;</div>
          </div>
          ${Tuner.gauge()}
          <div class="tn-readout"><span id="tnHz">— Hz</span><span id="tnCents">&nbsp;</span></div>
          <div id="tnStatus" class="tn-status">Touche Démarrer puis joue une corde</div>
          ${chrom ? '<div class="tn-chrom-note">Mode chromatique : toutes les notes sont détectées</div>' : Tuner.headstock(tun)}
          <button class="btn block tn-start ${Tuner.running ? '' : 'primary'}" data-action="tuner-toggle">${Tuner.running ? '■  Arrêter' : '🎤  Démarrer'}</button>
          <div id="tnError" class="card tn-error" ${Tuner.error ? '' : 'hidden'}>${esc(Tuner.error)}</div>
        </div>
        <div class="section-title">Accordage</div>
        <div class="chips">${TUNINGS.map((t) => `<button class="chip ${t.id === tun.id ? 'active' : ''}" data-action="tuner-tuning" data-id="${t.id}" ${chrom ? 'style="opacity:.45"' : ''}>${t.label}</button>`).join('')}</div>
        <label class="switch-row"><span>Mode chromatique</span><input type="checkbox" class="switch" data-change="tuner-chromatic" ${chrom ? 'checked' : ''}></label>
        <div class="switch-row" style="cursor:default"><span>La de référence</span>
          <div class="row" style="gap:6px"><button class="round-btn" style="width:46px;height:46px;font-size:22px" data-action="tuner-a4" data-v="-1">−</button>
          <b id="tnA4" style="min-width:74px;text-align:center;font-size:19px">${DATA.settings.a4} Hz</b>
          <button class="round-btn" style="width:46px;height:46px;font-size:22px" data-action="tuner-a4" data-v="1">+</button></div></div>
        <p class="muted small center">Pose le téléphone près de la guitare, dans un endroit calme. Joue une corde à la fois et laisse-la sonner.</p>`;
    }
  };

  const TAB_TEMPLATE = 'e|-----------------|\nB|-----------------|\nG|-----------------|\nD|-----------------|\nA|-----------------|\nE|-----------------|';

  /* ================= Rendu ================= */
  function render(scrollTop) {
    const v = top();
    const V = VIEWS[v.v];
    $('#title').textContent = V.title(v);
    const sub = stack().length > 1;
    $('#backBtn').hidden = !sub;
    $('#settingsBtn').hidden = sub;
    $('#title').classList.toggle('sub', sub);
    $('#topActions').innerHTML = V.actions ? V.actions(v) : '';
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === UI.tab));
    const view = $('#view');
    view.innerHTML = V.render(v);
    if (V.results) $('#results').innerHTML = V.results();
    view.scrollTop = scrollTop ? 0 : (v.scroll || 0);
    if (!$('.metro') && Metro.running) Metro.stop();
    if (UI.tab !== 'tuner' && (Tuner.running || Tuner.starting)) Tuner.stop();
    if (v.v === 'tuner' && Tuner.running) Tuner.idle();
    Timer.ui();
  }
  function refreshResults() {
    const V = VIEWS[top().v];
    if (V.results) $('#results').innerHTML = V.results();
    const c = $('.search .clear'); const q = $('#q');
    if (c && q) c.hidden = !q.value;
  }

  /* ================= Feuille (modale) & toast ================= */
  function openSheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
  function closeSheet() {
    $('#sheet').hidden = true; $('#sheetBody').innerHTML = '';
    if (!$('.metro') && Metro.running) Metro.stop();
  }
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function showChordSheet(name, chosenId) {
    const list = findChords(name);
    if (!list.length) {
      const base = String(name).split('/')[0];
      openSheet(`<div class="chord-big"><div class="name">${esc(name)}</div><p class="muted center">Cet accord n'est pas dans le dictionnaire.${base !== name ? '' : ''}</p>
        <button class="btn primary" data-action="new-chord-named" data-name="${esc(base)}">Créer cet accord</button></div>`);
      return;
    }
    const c = list.find((x) => x.id === chosenId) || list[0];
    const fav = DATA.favorites.includes(c.id);
    const slash = String(name).includes('/') ? `<p class="muted small center">Accord avec basse : ${esc(name)} (joue ${esc(c.name)} avec ${esc(String(name).split('/')[1])} à la basse)</p>` : '';
    openSheet(`<div class="chord-big">
        <div class="name">${esc(c.name)}</div>
        <div class="muted">${esc(c.note || c.shape || '')}</div>
        ${chordSVG(c)}
        <div class="notes-line">${chordNotes(c).join('  ')}</div>
        ${slash}
      </div>
      <div class="grid-2 play-row">
        <button class="btn primary" data-action="play-chord" data-id="${esc(c.id)}">▶  Écouter</button>
        <button class="btn" data-action="play-chord" data-arp="1" data-id="${esc(c.id)}">♪  Arpège</button>
      </div>
      ${list.length > 1 ? `<div class="label" style="margin-top:14px">Autres positions (${list.length})</div><div class="variants">${list.map((x) => `<button class="${x.id === c.id ? 'active' : ''}" data-action="chord-variant" data-name="${esc(name)}" data-id="${esc(x.id)}">${chordSVG(x)}</button>`).join('')}</div>` : ''}
      <div class="grid-2" style="margin-top:16px">
        <button class="btn ${fav ? 'primary' : ''}" data-action="toggle-fav-sheet" data-name="${esc(name)}" data-id="${esc(c.id)}">${fav ? '★ Favori' : '☆ Favori'}</button>
        ${c.custom ? `<button class="btn" data-action="edit-chord" data-id="${esc(c.id)}">Modifier</button>` : `<button class="btn" data-close>Fermer</button>`}
      </div>`);
  }

  function settingsSheet() {
    const n = DATA.songs.length, cc = DATA.customChords.length, h = DATA.history.length;
    openSheet(`<h2>Sauvegarde</h2>
      <p class="muted" style="margin-top:0">Tes données restent uniquement sur ce téléphone. iOS peut effacer les données d'une web app peu utilisée : exporte régulièrement un fichier de sauvegarde (dans Fichiers, iCloud Drive…).</p>
      <div class="card" style="margin-bottom:14px">
        <div class="history-row"><span>Morceaux</span><b>${n}</b></div>
        <div class="history-row"><span>Accords perso / favoris</span><b>${cc} / ${DATA.favorites.length}</b></div>
        <div class="history-row"><span>Séances enregistrées</span><b>${h}</b></div>
        <div class="history-row"><span>Dernier export</span><b>${DATA.lastExport ? fmtDate(DATA.lastExport) : 'jamais'}</b></div>
      </div>
      <button class="btn primary block" data-action="export">Exporter mes données (JSON)</button>
      <div style="height:10px"></div>
      <button class="btn block" data-action="import">Importer un fichier de sauvegarde</button>
      <input type="file" id="importFile" accept=".json,application/json" hidden>
      <div style="height:26px"></div>
      <button class="btn danger block" data-action="reset-all">Tout effacer</button>
      <p class="muted small center" style="margin-top:18px">Guitare · fonctionne hors connexion</p>`);
  }

  async function exportData() {
    const payload = { app: 'guitare-pwa', version: 1, exportedAt: todayISO(), data: DATA };
    const json = JSON.stringify(payload, null, 2);
    const name = 'guitare-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json';
    const blob = new Blob([json], { type: 'application/json' });
    const touch = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
    let done = false;
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Sauvegarde Guitare' });
        done = true;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (!done) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    DATA.lastExport = todayISO(); save();
    toast('Sauvegarde exportée');
    if (!$('#sheet').hidden) settingsSheet();
  }

  let pendingImport = null;
  function handleImportFile(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        const d = obj && obj.data ? obj.data : obj;
        if (!d || typeof d !== 'object' || !(Array.isArray(d.songs) || Array.isArray(d.customChords) || Array.isArray(d.history))) throw new Error('format');
        pendingImport = normalize(d);
        openSheet(`<h2>Importer</h2><p>Fichier : <b>${esc(file.name)}</b>${obj.exportedAt ? '<br><span class="muted">Exporté le ' + fmtDate(obj.exportedAt) + '</span>' : ''}</p>
          <div class="card" style="margin-bottom:14px">
            <div class="history-row"><span>Morceaux</span><b>${pendingImport.songs.length}</b></div>
            <div class="history-row"><span>Accords perso</span><b>${pendingImport.customChords.length}</b></div>
            <div class="history-row"><span>Exercices perso</span><b>${pendingImport.customExercises.length}</b></div>
            <div class="history-row"><span>Séances</span><b>${pendingImport.history.length}</b></div>
          </div>
          <button class="btn primary block" data-action="import-merge">Fusionner avec mes données</button><div style="height:10px"></div>
          <button class="btn block" data-action="import-replace">Remplacer toutes mes données</button><div style="height:10px"></div>
          <button class="btn block" data-close>Annuler</button>`);
      } catch (e) { toast('Fichier invalide : ce n\'est pas une sauvegarde Guitare.'); }
    };
    r.readAsText(file);
  }
  function mergeById(a, b) {
    const m = new Map(); a.forEach((x) => m.set(x.id, x));
    b.forEach((x) => { const cur = m.get(x.id); if (!cur || (x.updatedAt || '') >= (cur.updatedAt || '')) m.set(x.id, x); });
    return Array.from(m.values());
  }

  /* ================= Actions ================= */
  function newChordDraft(name) { return { name: name || '', type: 'maj', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] }; }
  function newSongDraft() { return { title: '', artist: '', key: '', capo: 0, tempo: '', status: 'todo', notes: '', sections: [{ name: 'Couplet', chords: '' }, { name: 'Refrain', chords: '' }], strum: { len: 8, slots: Array(8).fill('') }, riffs: [] }; }
  function goTab(t, v) { UI.tab = t; if (v) { UI.stacks[t] = [UI.stacks[t][0]]; } render(false); if (v) push(v); }

  const ACTIONS = {
    'clear-search'() { const q = $('#q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); q.focus(); },
    // Accords
    'chord-filter'(el) { UI.chordFilter = el.dataset.id; $$('[data-action=chord-filter]').forEach((c) => c.classList.toggle('active', c === el)); refreshResults(); },
    'open-chord'(el) { const c = allChords().find((x) => x.id === el.dataset.id); if (c) showChordSheet(c.name, c.id); },
    'toggle-fav'(el, ev) {
      ev.stopPropagation();
      const id = el.dataset.id, i = DATA.favorites.indexOf(id);
      if (i >= 0) DATA.favorites.splice(i, 1); else DATA.favorites.push(id);
      save(); refreshResults();
    },
    'toggle-fav-sheet'(el) {
      const id = el.dataset.id, i = DATA.favorites.indexOf(id);
      if (i >= 0) DATA.favorites.splice(i, 1); else DATA.favorites.push(id);
      save(); showChordSheet(el.dataset.name, id); if (top().v === 'chords') refreshResults();
    },
    'tuner-toggle'() { if (Tuner.running) Tuner.stop(); else Tuner.start(); },
    'tuner-tuning'(el) { DATA.settings.tuning = el.dataset.id; DATA.settings.chromatic = false; save(); render(false); },
    'tuner-a4'(el) { DATA.settings.a4 = Math.max(430, Math.min(450, DATA.settings.a4 + +el.dataset.v)); save(); $('#tnA4').textContent = DATA.settings.a4 + ' Hz'; },
    'show-barre'() { DATA.settings.showBarre = true; save(); const sw = $('[data-change=toggle-barre]'); if (sw) sw.checked = true; refreshResults(); },
    'play-chord'(el) { const c = allChords().find((x) => x.id === el.dataset.id); if (c) Guitar.play(c, !!el.dataset.arp); },
    'chord-variant'(el) { showChordSheet(el.dataset.name, el.dataset.id); },
    'show-chord'(el) { showChordSheet(el.dataset.name); },
    'new-chord'() { push({ v: 'chordEdit', draft: newChordDraft() }); },
    'new-chord-named'(el) { closeSheet(); goTab('chords', { v: 'chordEdit', draft: newChordDraft(el.dataset.name) }); },
    'edit-chord'(el) {
      const c = DATA.customChords.find((x) => x.id === el.dataset.id); if (!c) return;
      closeSheet(); goTab('chords', { v: 'chordEdit', id: c.id, draft: JSON.parse(JSON.stringify(c)) });
    },
    'save-chord'() {
      const v = top(), d = v.draft;
      d.name = (d.name || '').trim();
      if (!d.name) { toast('Donne un nom à l\'accord'); return; }
      if (!d.frets.some((f) => f >= 0)) { toast('Au moins une corde doit être jouée'); return; }
      const p = parseChord(d.name); d.root = p ? p.root : d.name;
      if (v.id) { const i = DATA.customChords.findIndex((x) => x.id === v.id); DATA.customChords[i] = Object.assign({}, d, { id: v.id }); }
      else { d.id = uid('c'); DATA.customChords.push(d); }
      save(); toast('Accord enregistré'); UI.chordFilter = 'mine'; pop();
    },
    'delete-chord'() {
      const v = top(); if (!confirm('Supprimer cet accord ?')) return;
      DATA.customChords = DATA.customChords.filter((x) => x.id !== v.id);
      DATA.favorites = DATA.favorites.filter((x) => x !== v.id);
      save(); pop();
    },
    // Exercices
    'ex-filter'(el) { UI.exLevel = el.dataset.id; $$('[data-action=ex-filter]').forEach((c) => c.classList.toggle('active', c === el)); refreshResults(); },
    'open-exercise'(el) { push({ v: 'exercise', id: el.dataset.id }); },
    'open-metro'() { openSheet(`<h2>Métronome</h2>${Metro.html()}<div style="height:12px"></div>${Timer.html()}`); },
    'metro-toggle'() { Metro.toggle(); },
    'metro-add'(el) { Metro.bpm = Metro.bpm + +el.dataset.v; },
    'metro-tap'() { Metro.tap(); },
    'timer-toggle'() { Timer.toggle(); },
    'timer-reset'() { Timer.reset(); },
    'mark-done'(el) {
      const mins = Math.round(Timer.elapsed() / 60000);
      openSheet(`<h2>Bravo ! 🎸</h2>
        <div class="field"><label>BPM atteint</label><input class="input" id="doneBpm" type="number" inputmode="numeric" value="${Metro.bpm}" style="font-size:28px;font-weight:800;text-align:center"></div>
        <div class="field"><label>Durée (minutes, facultatif)</label><input class="input" id="doneMin" type="number" inputmode="numeric" value="${mins || ''}"></div>
        <button class="btn primary block" data-action="save-done" data-id="${esc(el.dataset.id)}">Enregistrer dans l'historique</button>`);
    },
    'save-done'(el) {
      const bpm = parseInt($('#doneBpm').value, 10) || null, minutes = parseInt($('#doneMin').value, 10) || null;
      DATA.history.push({ id: uid('h'), exId: el.dataset.id, date: todayISO(), bpm, minutes });
      save(); closeSheet(); toast('Séance enregistrée ✓'); render(false);
    },
    'del-history'(el) {
      if (!confirm('Supprimer cette entrée de l\'historique ?')) return;
      DATA.history = DATA.history.filter((h) => h.id !== el.dataset.id); save(); render(false);
    },
    'new-exercise'() { push({ v: 'exerciseEdit', draft: { title: '', category: 'Mes exercices', level: 'debutant', bpm: 60, description: '', chordsText: '', tab: '', strum: Array(8).fill('') } }); },
    'edit-exercise'(el) {
      const e = getExercise(el.dataset.id); if (!e) return;
      push({ v: 'exerciseEdit', id: e.id, draft: { title: e.title, category: e.category || '', level: e.level, bpm: e.bpm || '', description: e.description || '', chordsText: (e.chords || []).join(' '), tab: e.tab || '', strum: (e.strum || Array(8).fill('')).slice(0, 8), isPreset: !!e.preset } });
    },
    'save-exercise'() {
      const v = top(), d = v.draft;
      if (!d.title.trim()) { toast('Donne un titre à l\'exercice'); return; }
      const ex = { id: v.id || uid('ex'), title: d.title.trim(), category: d.category.trim() || 'Mes exercices', level: d.level, bpm: parseInt(d.bpm, 10) || null, description: d.description, chords: d.chordsText.split(/\s+/).filter(Boolean), tab: d.tab, strum: d.strum.some((x) => x) ? d.strum : null, updatedAt: todayISO() };
      const i = DATA.customExercises.findIndex((x) => x.id === ex.id);
      if (i >= 0) DATA.customExercises[i] = ex; else DATA.customExercises.push(ex);
      save(); toast('Exercice enregistré');
      if (v.id) pop(); else replaceTop({ v: 'exercise', id: ex.id });
    },
    'delete-exercise'() {
      const v = top(); if (!confirm(v.draft.isPreset ? 'Masquer cet exercice prérempli ?' : 'Supprimer cet exercice ?')) return;
      DATA.customExercises = DATA.customExercises.filter((x) => x.id !== v.id);
      if (v.draft.isPreset) DATA.hiddenExercises.push(v.id);
      save(); UI.stacks.exercises = [UI.stacks.exercises[0]]; render(false);
    },
    'restore-exercise'() {
      const v = top(); DATA.customExercises = DATA.customExercises.filter((x) => x.id !== v.id); save(); toast('Version d\'origine restaurée'); pop();
    },
    'tab-template'(el) { const v = top(); const f = el.dataset.target; v.draft[f] = (v.draft[f] ? v.draft[f] + '\n\n' : '') + TAB_TEMPLATE; render(false); },
    'strum-cycle'(el) {
      const v = top(); const i = +el.dataset.i;
      const arr = v.v === 'songEdit' ? v.draft.strum.slots : v.draft.strum;
      const order = ['', 'D', 'U', 'X'];
      arr[i] = order[(order.indexOf(arr[i] || '') + 1) % 4];
      el.textContent = ARROW[arr[i]]; el.className = 'arrow ' + (arr[i] === 'X' ? 'x' : arr[i] ? '' : 'empty');
    },
    // Morceaux
    'song-filter'(el) { UI.songStatus = el.dataset.id; $$('[data-action=song-filter]').forEach((c) => c.classList.toggle('active', c === el)); refreshResults(); },
    'open-song'(el) { push({ v: 'song', id: el.dataset.id }); },
    'new-song'() { push({ v: 'songEdit', draft: newSongDraft() }); },
    'edit-song'(el) {
      const s = DATA.songs.find((x) => x.id === el.dataset.id); if (!s) return;
      const d = JSON.parse(JSON.stringify(s));
      d.sections = d.sections || []; d.riffs = d.riffs || []; d.strum = d.strum || { len: 8, slots: Array(8).fill('') };
      push({ v: 'songEdit', id: s.id, draft: d });
    },
    'song-status'(el) {
      const s = DATA.songs.find((x) => x.id === el.dataset.id); s.status = el.dataset.s; s.updatedAt = todayISO(); save(); render(false);
    },
    'song-metro'(el) { Metro.bpm = +el.dataset.bpm; ACTIONS['open-metro'](); },
    'draft-status'(el) { top().draft.status = el.dataset.s; $$('[data-action=draft-status]').forEach((b) => b.classList.toggle('active', b === el)); },
    'add-section'() { const d = top().draft; const used = d.sections.map((s) => s.name); d.sections.push({ name: SECTION_NAMES.find((n) => !used.includes(n)) || 'Section', chords: '' }); render(false); },
    'del-section'(el) { top().draft.sections.splice(+el.dataset.i, 1); render(false); },
    'add-riff'() { top().draft.riffs.push({ name: 'Riff ' + (top().draft.riffs.length + 1), tab: TAB_TEMPLATE }); render(false); },
    'del-riff'(el) { if (!confirm('Supprimer ce riff ?')) return; top().draft.riffs.splice(+el.dataset.i, 1); render(false); },
    'save-song'() {
      const v = top(), d = v.draft;
      if (!(d.title || '').trim()) { toast('Donne un titre au morceau'); return; }
      const now = todayISO();
      const s = Object.assign({}, d, {
        id: v.id || uid('song'), title: d.title.trim(), artist: (d.artist || '').trim(), capo: parseInt(d.capo, 10) || 0,
        tempo: parseInt(d.tempo, 10) || '', sections: d.sections.filter((x) => x.name || x.chords), riffs: d.riffs.filter((x) => x.tab && x.tab.trim()),
        createdAt: d.createdAt || now, updatedAt: now
      });
      const i = DATA.songs.findIndex((x) => x.id === s.id);
      if (i >= 0) DATA.songs[i] = s; else DATA.songs.push(s);
      save(); toast('Morceau enregistré');
      if (v.id) pop(); else replaceTop({ v: 'song', id: s.id });
    },
    'delete-song'() {
      const v = top(); if (!confirm('Supprimer définitivement ce morceau ?')) return;
      DATA.songs = DATA.songs.filter((x) => x.id !== v.id); save();
      UI.stacks.songs = [UI.stacks.songs[0]]; render(false); toast('Morceau supprimé');
    },
    // Sauvegarde
    'export'() { exportData(); },
    'import'() { const f = $('#importFile'); f.value = ''; f.click(); },
    'import-replace'() {
      if (!pendingImport) return;
      if (!confirm('Remplacer toutes tes données actuelles par celles du fichier ?')) return;
      DATA = pendingImport; pendingImport = null; save(); closeSheet(); resetStacks(); toast('Données importées');
    },
    'import-merge'() {
      if (!pendingImport) return;
      const p = pendingImport;
      DATA.songs = mergeById(DATA.songs, p.songs);
      DATA.customChords = mergeById(DATA.customChords, p.customChords);
      DATA.customExercises = mergeById(DATA.customExercises, p.customExercises);
      DATA.history = mergeById(DATA.history, p.history);
      DATA.favorites = Array.from(new Set(DATA.favorites.concat(p.favorites)));
      DATA.hiddenExercises = Array.from(new Set(DATA.hiddenExercises.concat(p.hiddenExercises)));
      pendingImport = null; save(); closeSheet(); resetStacks(); toast('Données fusionnées');
    },
    'reset-all'() {
      if (!confirm('Effacer TOUTES tes données (morceaux, accords perso, historique) ? Pense à exporter avant.')) return;
      if (!confirm('Vraiment ? Cette action est définitive.')) return;
      DATA = defaultData(); DATA.songs = []; save(); closeSheet(); resetStacks(); toast('Données effacées');
    }
  };
  function resetStacks() { Object.keys(UI.stacks).forEach((k) => { UI.stacks[k] = [UI.stacks[k][0]]; }); render(false); }

  /* ================= Événements ================= */
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) { closeSheet(); return; }
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });

  $('#backBtn').addEventListener('click', pop);
  $('#settingsBtn').addEventListener('click', settingsSheet);
  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    if (UI.tab === t.dataset.tab) { if (stack().length > 1) { UI.stacks[UI.tab] = [stack()[0]]; render(false); } else $('#view').scrollTo({ top: 0, behavior: 'smooth' }); return; }
    top().scroll = $('#view').scrollTop;
    UI.tab = t.dataset.tab; render(false);
  }));

  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.id === 'q') {
      const k = { chords: 'chordQuery', exercises: 'exQuery', songs: 'songQuery' }[top().v];
      if (k) { UI[k] = el.value; refreshResults(); }
      return;
    }
    if (el.dataset.input === 'metro-range') { Metro.bpm = +el.value; return; }
    const v = top(); if (!v.draft) return;
    if (el.dataset.bind) { v.draft[el.dataset.bind] = el.value; if (v.v === 'chordEdit') VIEWS.chordEdit.refresh(v); }
    else if (el.dataset.arr) { v.draft[el.dataset.arr][+el.dataset.i] = parseInt(el.value, 10); if (v.v === 'chordEdit') VIEWS.chordEdit.refresh(v); }
    else if (el.dataset.sec) v.draft.sections[+el.dataset.sec][el.dataset.f] = el.value;
    else if (el.dataset.riff) v.draft.riffs[+el.dataset.riff][el.dataset.f] = el.value;
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.id === 'importFile' && el.files && el.files[0]) { handleImportFile(el.files[0]); return; }
    const c = el.dataset.change;
    if (!c) return;
    if (c === 'tuner-chromatic') { DATA.settings.chromatic = el.checked; save(); render(false); }
    else if (c === 'toggle-barre') { DATA.settings.showBarre = el.checked; save(); refreshResults(); }
    else if (c === 'metro-beats') Metro.beats = +el.value;
    else if (c === 'timer-target') { Timer.target = +el.value; Timer.rang = false; Timer.ui(); }
    else if (c === 'song-artist') { UI.songArtist = el.value; refreshResults(); }
    else if (c === 'song-key') { UI.songKey = el.value; refreshResults(); }
    else if (c === 'song-sort') { UI.songSort = el.value; refreshResults(); }
    else if (c === 'strum-len') {
      const s = top().draft.strum; const len = +el.value;
      if (len !== s.len) { s.slots = len === 16 ? s.slots.flatMap((x) => [x, '']) : s.slots.filter((_, i) => i % 2 === 0); s.len = len; render(false); }
    }
  });

  // Feuille du bas : glisser vers le bas pour fermer
  (function sheetSwipe() {
    const panel = $('.sheet-panel'), backdrop = $('.sheet-backdrop');
    // mode : null (indécis), 'drag' (la feuille suit le doigt), 'scroll' (défilement du contenu), 'ignore'
    let startY = 0, startX = 0, lastY = 0, dy = 0, t0 = 0, mode = null, onPanel = true;
    const reset = (anim) => {
      panel.style.transition = anim ? 'transform .2s ease' : '';
      panel.style.transform = ''; backdrop.style.opacity = '';
    };
    const begin = (x, y, target) => {
      if (target.closest('input, select, textarea')) { mode = 'ignore'; return; }
      onPanel = !!target.closest('.sheet-panel');
      startX = x; startY = lastY = y; dy = 0; t0 = Date.now(); mode = null;
    };
    const atTop = () => !onPanel || panel.scrollTop <= 0;
    const startDrag = (y) => { mode = 'drag'; startY = y; t0 = Date.now(); panel.style.transition = 'none'; };
    const move = (x, y, ev) => {
      if (mode === 'ignore') return;
      const down = y > lastY; lastY = y;
      const ddy = y - startY, ddx = x - startX;
      if (mode === null) {
        if (Math.abs(ddx) > Math.abs(ddy) && Math.abs(ddx) > 4) { mode = 'ignore'; return; } // geste horizontal (ex. autres positions)
        if (ddy > 0 && atTop()) startDrag(startY);   // vers le bas, n'importe où sur la feuille
        else if (ddy !== 0) mode = 'scroll';           // le contenu défile d'abord
        else return;
      }
      if (mode === 'scroll') {
        // on fait remonter le contenu puis, une fois en haut, on continue en tirant la feuille
        if (down && atTop()) startDrag(y); else return;
      }
      dy = Math.max(0, y - startY);
      panel.style.transform = `translateY(${dy}px)`;
      backdrop.style.opacity = String(Math.max(0.15, 1 - dy / (panel.offsetHeight || 400)));
      if (ev && ev.cancelable) ev.preventDefault();
    };
    const end = () => {
      if (mode !== 'drag') { mode = null; return; }
      mode = null;
      const speed = dy / Math.max(1, Date.now() - t0); // px/ms
      if (dy > Math.min(140, panel.offsetHeight * 0.3) || (speed > 0.6 && dy > 30)) {
        panel.style.transition = 'transform .2s ease';
        panel.style.transform = 'translateY(100%)';
        backdrop.style.transition = 'opacity .2s'; backdrop.style.opacity = '0';
        setTimeout(() => { closeSheet(); reset(false); backdrop.style.transition = ''; }, 200);
      } else reset(true);
    };
    const sheet = $('#sheet'); // toute la feuille, fond assombri compris
    sheet.addEventListener('touchstart', (e) => begin(e.touches[0].clientX, e.touches[0].clientY, e.target), { passive: true });
    sheet.addEventListener('touchmove', (e) => move(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', () => { mode = null; reset(true); });
    // souris (ordinateur) : glisser depuis la poignée
    $('.sheet-grip').addEventListener('mousedown', (e) => {
      begin(e.clientX, e.clientY, e.target);
      const mm = (ev) => move(ev.clientX, ev.clientY, ev);
      const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); end(); };
      document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
    });
  })();

  // Micro coupé dès que l'app passe en arrière-plan
  // et aucun son ne reste « en lecture » sur l'écran verrouillé (sauf si le métronome tourne)
  const silenceAll = () => {
    if (Tuner.running || Tuner.starting) Tuner.stop();
    if (Audio.ctx) Guitar.stop(Audio.ctx);
    Guitar.voices = [];
    if (!Metro.running) Audio.release();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) silenceAll(); });
  window.addEventListener('pagehide', () => { Metro.stop(); silenceAll(); Audio.release(); });

  // Entrée sur le champ de recherche : ferme le clavier
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.id === 'q') ev.target.blur(); });

  render(false);

  /* ================= Service worker ================= */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch((e) => console.warn('SW', e)));
  }

  // Exposé pour les tests
  window.__guitare = { parseChord, findChords, allChords, chordNotes, DATA: () => DATA, yin, Tuner, Guitar, Audio, Metro };
})();
