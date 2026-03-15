// Constantes de mise en page du plateau de jeu
// Toutes les dimensions sont en proportions relatives à la zone de jeu (sans le header)

// --- Cartes ---
export const RATIO_LARGEUR_CARTE = 0.09; // largeur carte = 9% largeur écran (plus petit)
export const RATIO_ASPECT_CARTE = 1.45; // hauteur / largeur

// --- Zone du pli (positions des cartes jouées au centre, resserrées) ---
export const POSITIONS_PLI = {
  sud: { x: 0.5, y: 0.54 },
  nord: { x: 0.5, y: 0.39 },
  ouest: { x: 0.39, y: 0.47 },
  est: { x: 0.61, y: 0.47 },
} as const;

// --- Rotation de base par position (aspect « posé par le joueur ») ---
const ROTATIONS_BASE: Record<string, number> = {
  sud: 0,
  nord: 0,
  ouest: -8,
  est: 8,
};

// --- Variation pseudo-aléatoire des cartes posées (aspect naturel) ---
function hashCarte(couleur: string, rang: string): number {
  let h = 0;
  const cle = `${couleur}-${rang}`;
  for (let i = 0; i < cle.length; i++) {
    h = (h * 31 + cle.charCodeAt(i)) | 0;
  }
  return h;
}

/** Retourne la rotation totale (base + aléatoire) et les décalages proportionnels */
export function variationCartePli(couleur: string, rang: string, position: string) {
  const h = hashCarte(couleur, rang);
  const rotationBase = ROTATIONS_BASE[position] ?? 0;
  // Rotation supplémentaire entre -5° et +5°
  const rotationAleatoire = ((h % 110) / 110) * 10 - 5;
  const rotation = rotationBase + rotationAleatoire;
  // Décalage X entre -0.008 et +0.008 (fraction de largeur écran)
  const decalageX = (((h >> 8) % 90) / 90) * 0.016 - 0.008;
  // Décalage Y entre -0.006 et +0.006 (fraction de hauteur écran)
  const decalageY = (((h >> 16) % 70) / 70) * 0.012 - 0.006;
  return { rotation, decalageX, decalageY };
}

// --- Main du joueur (éventail) ---
export const EVENTAIL = {
  angleTotal: 40, // angle total de l'éventail en degrés (±20°)
  decalageArc: 0.04, // hauteur de l'arc en % de hauteur écran
  chevauchement: 0.55, // facteur de chevauchement entre cartes (0 = pas, 1 = complet)
} as const;

// --- Mains adversaires (éventail adapté par côté) ---
export const ADVERSAIRE = {
  ratioLargeurCarte: 0.04, // cartes adversaires très petites (juste indicatives)
  chevauchement: 0.7, // fort chevauchement
  margeNordY: -0.02, // déborde légèrement en haut
  margeCoteX: -0.01, // déborde légèrement sur les côtés
  angleTotal: 20, // éventail discret
  decalageArc: 0.02, // arc léger
} as const;

// --- Zone indicateurs ---
export const INDICATEURS = {
  atoutY: 0.3, // position Y de l'indicateur d'atout (en % hauteur zone de jeu)
} as const;

// --- Animations ---
export const ANIMATIONS = {
  // Distribution : cartes volent du centre vers les mains
  distribution: {
    dureeCarte: 200, // durée par carte (ms)
    delaiEntre: 80, // délai entre chaque carte (ms)
    originX: 0.5, // position X de départ (centre)
    originY: 0.45, // position Y de départ (centre)
  },
  // Jeu de carte : main → centre
  jeuCarte: {
    duree: 300, // durée de l'animation (ms)
  },
  // Ramassage du pli : centre → gagnant
  ramassagePli: {
    duree: 400, // durée de l'animation (ms)
    delaiAvant: 800, // pause avant ramassage pour voir le pli (ms)
  },
  // Délai des bots (phase jeu)
  delaiBot: {
    min: 500, // délai minimum (ms)
    max: 1000, // délai maximum (ms)
  },
  // Délai des bots (phase enchères — plus lent pour que le joueur suive)
  delaiEncheres: {
    min: 2000, // délai minimum (ms)
    max: 3000, // délai maximum (ms)
  },
  // Pause après la distribution pour montrer la carte retournée avant les enchères
  pauseAvantEncheres: 3000, // ms
} as const;

// --- Positions de départ/arrivée pour les animations ---
export const POSITIONS_MAINS = {
  sud: { x: 0.5, y: 0.92 },
  nord: { x: 0.5, y: 0.02 },
  ouest: { x: 0.02, y: 0.5 },
  est: { x: 0.98, y: 0.5 },
} as const;
