// Constantes de mise en page du plateau de jeu
// Toutes les dimensions sont en proportions relatives à la zone de jeu (sans le header)

// --- Cartes ---
export const RATIO_LARGEUR_CARTE = 0.09; // largeur carte = 9% largeur écran (plus petit)
export const RATIO_ASPECT_CARTE = 1.45; // hauteur / largeur

// --- Zone du pli (positions des cartes jouées au centre, resserrées) ---
export const POSITIONS_PLI = {
  sud: { x: 0.5, y: 0.52 },
  nord: { x: 0.5, y: 0.41 },
  ouest: { x: 0.42, y: 0.47 },
  est: { x: 0.58, y: 0.47 },
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
  // Rotation supplémentaire entre -12° et +12°
  const rotationAleatoire = ((h % 110) / 110) * 24 - 12;
  const rotation = rotationBase + rotationAleatoire;
  // Décalage X entre -0.018 et +0.018 (fraction de largeur écran)
  const decalageX = (((h >> 8) % 90) / 90) * 0.036 - 0.018;
  // Décalage Y entre -0.014 et +0.014 (fraction de hauteur écran)
  const decalageY = (((h >> 16) % 70) / 70) * 0.028 - 0.014;
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
  ratioLargeurCarte: 0.055, // cartes adversaires plus visibles
  chevauchement: 0.65, // chevauchement modéré
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
  // Distribution : 3 phases — tapis → prise en main (flip) → tri
  distribution: {
    // Phase 1 — vol centre → tapis
    dureeCarte: 300, // durée de vol par carte (ms)
    delaiDansPaquet: 60, // délai entre cartes d'un même paquet (ms)
    delaiEntreJoueurs: 200, // délai entre les paquets de chaque joueur (ms)
    pauseEntreTours: 500, // pause entre le tour de 3 et le tour de 2 (ms)
    offsetAleatoireMax: 0.02, // ±2% position aléatoire sur le tapis
    rotationAleatoireMax: 15, // ±15° rotation aléatoire sur le tapis
    decalagePaquet2: 0.03, // décalage x entre paquet 1 et 2
    // Phase 2 — prise en main (flip + vol tapis → main)
    dureePriseEnMain: 400, // durée du vol tapis → main (ms)
    staggerPriseEnMain: 80, // délai entre chaque carte (ms)
    pauseAvantPrise: 200, // pause après atterrissage avant prise (ms)
    // Phase 3 — tri (existant)
    pauseAvantTri: 400, // pause avant animation de tri (ms)
    // Distribution restante — slide carte retournée
    dureeSlideRetournee: 300, // durée du slide vers tapis preneur (ms)
    // Origine (centre du tapis)
    originX: 0.5,
    originY: 0.45,
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

// --- Piles de plis remportés (positions des tas de cartes par équipe) ---
export const POSITIONS_PILES = {
  equipe1: { x: 0.82, y: 0.82 }, // en bas à droite, près de sud
  equipe2: { x: 0.08, y: 0.22 }, // à gauche, bien au-dessus de ouest
} as const;

// --- Positions de départ/arrivée pour les animations ---
export const POSITIONS_MAINS = {
  sud: { x: 0.5, y: 0.92 },
  nord: { x: 0.5, y: 0.02 },
  ouest: { x: 0.02, y: 0.5 },
  est: { x: 0.98, y: 0.5 },
} as const;

// --- Positions tapis (où les cartes atterrissent face cachée avant la prise en main) ---
export const POSITIONS_TAPIS = {
  sud: { x: 0.5, y: 0.75 },
  nord: { x: 0.5, y: 0.18 },
  ouest: { x: 0.18, y: 0.5 },
  est: { x: 0.82, y: 0.5 },
} as const;
