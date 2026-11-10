/* Exercices préremplis.
 * level : 'debutant' | 'intermediaire' | 'avance'
 * tab : tablature texte (facultatif), chords : noms d'accords à afficher en diagramme (facultatif)
 * strum : motif de grattage sur 8 croches (1 & 2 & 3 & 4 &) : 'D' bas, 'U' haut, 'X' étouffé, '' rien
 */
window.EXERCISE_DATA = [
  {
    id: 'ex-chg-em-am',
    title: 'Changements Em ↔ Am',
    category: 'Changements d\'accords',
    level: 'debutant',
    bpm: 60,
    description: 'Alterne Em et Am, 4 temps chacun. Garde les doigts 2 et 3 groupés : ils glissent simplement d\'une corde. Monte le tempo quand les changements sont propres, sans blanc.',
    chords: ['Em', 'Am']
  },
  {
    id: 'ex-chg-g-c-d',
    title: 'G – C – D (one minute changes)',
    category: 'Changements d\'accords',
    level: 'debutant',
    bpm: 60,
    description: 'Pendant 1 minute, enchaîne G → C → D → G le plus de fois possible en grattant une fois par accord. Note ton score dans l\'historique et essaie de le battre chaque jour.',
    chords: ['G', 'C', 'D']
  },
  {
    id: 'ex-chg-c-am-f-g',
    title: 'Grille C – Am – F – G',
    category: 'Changements d\'accords',
    level: 'intermediaire',
    bpm: 70,
    description: 'La grille la plus courante de la pop. 1 mesure par accord. Utilise le petit Fa au début, puis remplace-le par le Fa barré.',
    chords: ['C', 'Am', 'F', 'G']
  },
  {
    id: 'ex-strum-base',
    title: 'Grattage : 4 temps vers le bas',
    category: 'Rythmes de grattage',
    level: 'debutant',
    bpm: 70,
    description: 'Un coup vers le bas sur chaque temps. Le bras bouge en continu (bas-haut) même quand il ne touche pas les cordes : c\'est la base de tous les rythmes.',
    strum: ['D', '', 'D', '', 'D', '', 'D', ''],
    chords: ['G']
  },
  {
    id: 'ex-strum-pop',
    title: 'Grattage pop : ↓ ↓↑ ↑↓↑',
    category: 'Rythmes de grattage',
    level: 'debutant',
    bpm: 80,
    description: 'Le rythme « passe-partout » : bas, bas-haut, haut-bas-haut. Le 3e temps n\'est pas joué (le bras descend dans le vide). Compte à voix haute : 1, 2 &, & 4 &.',
    strum: ['D', '', 'D', 'U', '', 'U', 'D', 'U'],
    chords: ['C', 'G']
  },
  {
    id: 'ex-strum-reggae',
    title: 'Grattage avec étouffé (chop)',
    category: 'Rythmes de grattage',
    level: 'intermediaire',
    bpm: 85,
    description: 'Sur les temps 2 et 4, relâche la pression de la main gauche ou pose la paume droite sur les cordes pour un « tchak » percussif (X).',
    strum: ['D', '', 'X', 'U', 'D', 'U', 'X', 'U'],
    chords: ['Am']
  },
  {
    id: 'ex-spider-1',
    title: 'Araignée chromatique 1-2-3-4',
    category: 'Araignée chromatique',
    level: 'debutant',
    bpm: 60,
    description: 'Un doigt par case, frettes 1 à 4, de la 6e à la 1re corde puis retour. Garde les doigts près des cordes et joue en aller-retour au médiator (bas-haut).',
    tab: 'e|-------------------------------1-2-3-4-|\nB|-----------------------1-2-3-4---------|\nG|---------------1-2-3-4-----------------|\nD|-------1-2-3-4-------------------------|\nA|-1-2-3-4-------------------------------|\nE|1-2-3-4--------------------------------|'
  },
  {
    id: 'ex-spider-2',
    title: 'Araignée croisée 1-3-2-4',
    category: 'Araignée chromatique',
    level: 'intermediaire',
    bpm: 60,
    description: 'Même principe, mais ordre des doigts 1-3-2-4. Excellent pour l\'indépendance des doigts. Décale l\'exercice d\'une case vers le haut à chaque passage.',
    tab: 'e|------------------------1-3-2-4-|\nB|--------------------1-3-2-4-----|\nG|----------------1-3-2-4---------|\nD|----------1-3-2-4---------------|\nA|----1-3-2-4---------------------|\nE|1-3-2-4-------------------------|'
  },
  {
    id: 'ex-penta-am-1',
    title: 'Pentatonique de La mineur (position 1)',
    category: 'Gammes pentatoniques',
    level: 'debutant',
    bpm: 60,
    description: 'La gamme reine du rock et du blues, en 5e position. Index sur la case 5, auriculaire (ou annulaire) sur la case 8. Monte puis descends, en croches.',
    tab: 'e|-----------------------------5-8-|\nB|-------------------------5-8-----|\nG|-------------------5-7-----------|\nD|-------------5-7-----------------|\nA|-------5-7-----------------------|\nE|-5-8-----------------------------|'
  },
  {
    id: 'ex-penta-am-2',
    title: 'Pentatonique de La mineur (position 2)',
    category: 'Gammes pentatoniques',
    level: 'intermediaire',
    bpm: 70,
    description: 'Deuxième position, de la case 7 à 10. Relie-la à la position 1 en glissant sur la corde de Sol.',
    tab: 'e|------------------------------8-10-|\nB|-------------------------8-10------|\nG|-------------------7-9-------------|\nD|-------------7-10------------------|\nA|-------7-10------------------------|\nE|-8-10------------------------------|'
  },
  {
    id: 'ex-penta-seq',
    title: 'Séquences par 3 en pentatonique',
    category: 'Gammes pentatoniques',
    level: 'avance',
    bpm: 80,
    description: 'Joue la position 1 par groupes de 3 notes (1-2-3, 2-3-4, 3-4-5…) en triolets. Travaille avec le métronome et alterne strictement le médiator.',
    tab: 'e|-------------------------|\nB|-------------------------|\nG|-------------------------|\nD|-----------------5---5-7-|\nA|-----5---5-7-5-7---7-----|\nE|-5-8---8-----------------|'
  },
  {
    id: 'ex-barre-f',
    title: 'Fa barré : construction',
    category: 'Exercices de barré',
    level: 'intermediaire',
    bpm: 50,
    description: 'Pose l\'index à plat sur la case 1, joue corde par corde pour vérifier que chaque note sonne. Ajoute ensuite les autres doigts. Repos dès que la main fatigue : le barré vient avec le temps, pas avec la force.',
    chords: ['F']
  },
  {
    id: 'ex-barre-slide',
    title: 'Barré mobile F – G – A – G',
    category: 'Exercices de barré',
    level: 'intermediaire',
    bpm: 60,
    description: 'Garde la forme de Mi barrée et glisse-la : case 1 (F), 3 (G), 5 (A), 3 (G). Relâche légèrement la pression pendant le déplacement, sans quitter les cordes.',
    chords: ['F', 'G', 'A']
  },
  {
    id: 'ex-barre-bm',
    title: 'Changements Bm – G – D – A',
    category: 'Exercices de barré',
    level: 'avance',
    bpm: 70,
    description: 'Bm en forme de La barrée (case 2), entouré d\'accords ouverts. Prépare le barré pendant le dernier temps de l\'accord précédent.',
    chords: ['Bm', 'G', 'D', 'A']
  }
];
