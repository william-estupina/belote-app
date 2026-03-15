// Constantes de mise en page du plateau de jeu
// Toutes les dimensions sont en proportions relatives à la zone de jeu (sans le header)

// --- Cartes ---
export const RATIO_LARGEUR_CARTE = 0.09; // largeur carte = 9% largeur écran (plus petit)
export const RATIO_ASPECT_CARTE = 1.45; // hauteur / largeur

// --- Zone du pli (positions des cartes jouées au centre) ---
export const POSITIONS_PLI = {
  sud: { x: 0.5, y: 0.58 },
  nord: { x: 0.5, y: 0.35 },
  ouest: { x: 0.35, y: 0.47 },
  est: { x: 0.65, y: 0.47 },
} as const;

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
