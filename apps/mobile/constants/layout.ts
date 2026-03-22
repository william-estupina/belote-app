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
  ratioLargeurCarte: 0.05, // cartes adversaires legerement plus petites pour degager le plateau
  chevauchement: 0.65, // chevauchement modéré
  margeNordY: -0.045, // rogne davantage la main du haut pour liberer le centre
  margeCoteX: -0.025, // rogne davantage sur les cotes pour gagner de l'espace
  angleTotal: 20, // éventail discret
  decalageArc: 0.02, // arc léger
} as const;

// --- Zone indicateurs ---
export const INDICATEURS = {
  atoutY: 0.3, // position Y de l'indicateur d'atout (en % hauteur zone de jeu)
} as const;

// --- Animations ---
export const ANIMATIONS = {
  // Distribution : vol centre → main (par paquets simultanés, 3 puis 2)
  distribution: {
    dureeCarte: 800, // durée de vol par carte (ms)
    delaiEntreJoueurs: 500, // délai entre les paquets de chaque joueur (ms)
    pauseEntreRounds: 0, // pas de pause entre le paquet de 3 et le paquet de 2
    easingDistribution: "out-cubic" as const, // décélération naturelle à l'arrivée
    staggerIntraPaquet: 0, // toutes les cartes d'un même paquet partent en même temps
    arcDistribution: {
      decalagePerpendiculaire: 0.05, // 5% de la distance, perpendiculaire à l'axe de vol
    },
    // Éventail en vol : spread des cartes dans un même paquet
    eventailVol: {
      ecartX: 0.03, // écart horizontal entre cartes adjacentes (fraction écran)
      ecartRotation: 10, // écart de rotation entre cartes adjacentes (degrés)
    },
    dureeReorganisationMain: 350, // durée du placement/tri visuel dans la main du joueur (ms)
    // Tri après distribution
    pauseAvantTri: 250, // pause avant animation de tri (ms)
    // Distribution restante — slide carte retournée
    dureeSlideRetournee: 600, // durée du slide vers main preneur (ms)
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
  pauseAvantEncheres: 1500, // ms
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
