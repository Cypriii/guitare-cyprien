/* Dictionnaire d'accords.
 * Cordes de la plus grave (Mi grave, index 0) à la plus aiguë (Mi aigu, index 5).
 * frets : -1 = étouffée (x), 0 = à vide, n = numéro de frette absolu.
 * fingers : 0 = pas de doigt, 1 = index, 2 = majeur, 3 = annulaire, 4 = auriculaire.
 * Le barré est détecté automatiquement (même doigt 1 sur plusieurs cordes à la même frette).
 */
(function () {
  const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const FR = { C: 'Do', 'C#': 'Do#', D: 'Ré', Eb: 'Mib', E: 'Mi', F: 'Fa', 'F#': 'Fa#', G: 'Sol', Ab: 'Lab', A: 'La', Bb: 'Sib', B: 'Si' };

  const TYPES = [
    { id: 'maj', suffix: '', label: 'Majeur', intervals: [0, 4, 7] },
    { id: 'm', suffix: 'm', label: 'Mineur', intervals: [0, 3, 7] },
    { id: '7', suffix: '7', label: '7', intervals: [0, 4, 7, 10] },
    { id: 'maj7', suffix: 'maj7', label: 'maj7', intervals: [0, 4, 7, 11] },
    { id: 'm7', suffix: 'm7', label: 'm7', intervals: [0, 3, 7, 10] },
    { id: 'sus2', suffix: 'sus2', label: 'sus2', intervals: [0, 2, 7] },
    { id: 'sus4', suffix: 'sus4', label: 'sus4', intervals: [0, 5, 7] },
    { id: 'add9', suffix: 'add9', label: 'add9', intervals: [0, 4, 7, 2] },
    { id: '5', suffix: '5', label: 'Power chord', intervals: [0, 7] }
  ];

  // Accords ouverts : [racine, type, frets, doigts]
  const X = -1;
  const OPEN = [
    ['C', 'maj', [X, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]],
    ['D', 'maj', [X, X, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]],
    ['E', 'maj', [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]],
    ['G', 'maj', [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]],
    ['A', 'maj', [X, 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0]],
    ['F', 'maj', [X, X, 3, 2, 1, 1], [0, 0, 3, 2, 1, 1], 'Petit Fa'],
    ['Am', 'm', [X, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]],
    ['Dm', 'm', [X, X, 0, 2, 3, 1], [0, 0, 0, 2, 3, 1]],
    ['Em', 'm', [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]],
    ['C', '7', [X, 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0]],
    ['D', '7', [X, X, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]],
    ['E', '7', [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]],
    ['G', '7', [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]],
    ['A', '7', [X, 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0]],
    ['B', '7', [X, 2, 1, 2, 0, 2], [0, 2, 1, 3, 0, 4]],
    ['C', 'maj7', [X, 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0]],
    ['D', 'maj7', [X, X, 0, 2, 2, 2], [0, 0, 0, 1, 2, 3]],
    ['E', 'maj7', [0, 2, 1, 1, 0, 0], [0, 3, 1, 2, 0, 0]],
    ['F', 'maj7', [X, X, 3, 2, 1, 0], [0, 0, 3, 2, 1, 0]],
    ['G', 'maj7', [3, 2, 0, 0, 0, 2], [3, 2, 0, 0, 0, 1]],
    ['A', 'maj7', [X, 0, 2, 1, 2, 0], [0, 0, 2, 1, 3, 0]],
    ['A', 'm7', [X, 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0]],
    ['D', 'm7', [X, X, 0, 2, 1, 1], [0, 0, 0, 2, 1, 1]],
    ['E', 'm7', [0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]],
    ['A', 'sus2', [X, 0, 2, 2, 0, 0], [0, 0, 1, 2, 0, 0]],
    ['D', 'sus2', [X, X, 0, 2, 3, 0], [0, 0, 0, 1, 3, 0]],
    ['C', 'sus2', [X, 3, 0, 0, 1, 3], [0, 3, 0, 0, 1, 4]],
    ['A', 'sus4', [X, 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0]],
    ['D', 'sus4', [X, X, 0, 2, 3, 3], [0, 0, 0, 1, 3, 4]],
    ['E', 'sus4', [0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]],
    ['C', 'sus4', [X, 3, 3, 0, 1, 1], [0, 3, 4, 0, 1, 1]],
    ['G', 'sus4', [3, 3, 0, 0, 1, 3], [2, 3, 0, 0, 1, 4]],
    ['C', 'add9', [X, 3, 2, 0, 3, 0], [0, 2, 1, 0, 3, 0]],
    ['E', 'add9', [0, 2, 2, 1, 0, 2], [0, 2, 3, 1, 0, 4]],
    ['A', 'add9', [X, 0, 2, 4, 2, 0], [0, 0, 1, 4, 2, 0]],
    ['G', 'add9', [3, 0, 0, 2, 0, 3], [2, 0, 0, 1, 0, 3]],
    ['E', '5', [0, 2, 2, X, X, X], [0, 1, 2, 0, 0, 0]],
    ['A', '5', [X, 0, 2, 2, X, X], [0, 0, 1, 2, 0, 0]],
    ['D', '5', [X, X, 0, 2, 3, X], [0, 0, 0, 1, 2, 0]]
  ].map(([root, type, frets, fingers, note]) => ({ root: root.replace(/m$/, ''), type, frets, fingers, shape: 'Ouvert', note }));

  // Formes barrées mobiles (r = frette de la fondamentale)
  // Forme de Mi : fondamentale sur la 6e corde
  const E_SHAPE = {
    maj: [[0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]],
    m: [[0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]],
    '7': [[0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]],
    maj7: [[0, 2, 1, 1, 0, 0], [1, 4, 2, 3, 1, 1]],
    m7: [[0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]],
    sus4: [[0, 2, 2, 2, 0, 0], [1, 2, 3, 4, 1, 1]],
    '5': [[0, 2, 2, X, X, X], [1, 3, 4, 0, 0, 0]]
  };
  // Forme de La : fondamentale sur la 5e corde
  const A_SHAPE = {
    maj: [[X, 0, 2, 2, 2, 0], [0, 1, 3, 3, 3, 1]],
    m: [[X, 0, 2, 2, 1, 0], [0, 1, 3, 4, 2, 1]],
    '7': [[X, 0, 2, 0, 2, 0], [0, 1, 3, 1, 4, 1]],
    maj7: [[X, 0, 2, 1, 2, 0], [0, 1, 3, 2, 4, 1]],
    m7: [[X, 0, 2, 0, 1, 0], [0, 1, 3, 1, 2, 1]],
    sus2: [[X, 0, 2, 2, 0, 0], [0, 1, 3, 4, 1, 1]],
    sus4: [[X, 0, 2, 2, 3, 0], [0, 1, 2, 3, 4, 1]],
    add9: [[X, 0, 2, 4, 2, 0], [0, 1, 2, 4, 3, 1]],
    '5': [[X, 0, 2, 2, X, X], [0, 1, 3, 4, 0, 0]]
  };

  const list = [];
  const seen = new Set();
  const key = (c) => c.frets.join(',');
  const push = (c) => {
    const t = TYPES.find((t) => t.id === c.type);
    c.name = c.root + t.suffix;
    c.id = 'p-' + c.name + '-' + key(c);
    if (seen.has(c.id)) return;
    seen.add(c.id);
    list.push(c);
  };

  OPEN.forEach(push);

  ROOTS.forEach((root, i) => {
    // Forme de Mi : Mi = 4
    let r = (i - 4 + 12) % 12;
    Object.entries(E_SHAPE).forEach(([type, [f, fg]]) => {
      if (r === 0) {
        if (type !== '5') return; // les accords ouverts de Mi existent déjà (sauf E5 déjà là aussi)
        return;
      }
      push({ root, type, frets: f.map((v) => (v < 0 ? -1 : v + r)), fingers: fg.slice(), shape: 'Barré forme de Mi' });
    });
    // Forme de La : La = 9
    r = (i - 9 + 12) % 12;
    Object.entries(A_SHAPE).forEach(([type, [f, fg]]) => {
      if (r === 0) return;
      push({ root, type, frets: f.map((v) => (v < 0 ? -1 : v + r)), fingers: fg.slice(), shape: 'Barré forme de La' });
    });
  });

  // Power chords sans barré (doigts 1-3-4) : déjà corrects pour les formes de Mi et La.

  // Tri : racine, puis type, puis position
  const typeOrder = TYPES.map((t) => t.id);
  list.sort((a, b) =>
    ROOTS.indexOf(a.root) - ROOTS.indexOf(b.root) ||
    typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) ||
    Math.max(...a.frets) - Math.max(...b.frets)
  );

  window.CHORD_DATA = { ROOTS, FR, TYPES, CHORDS: list };
})();
