// Constantes de mise en page du plateau de jeu
// Toutes les dimensions sont en proportions relatives à la zone de jeu (sans le header)

// --- Cartes ---
export const RATIO_LARGEUR_CARTE = 0.11; // largeur carte = 11% largeur écran
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
  decalageArc: 0.06, // hauteur de l'arc en % de hauteur écran
  chevauchement: 0.5, // facteur de chevauchement entre cartes (0 = pas, 1 = complet)
} as const;

// --- Mains adversaires ---
export const ADVERSAIRE = {
  ratioLargeurCarte: 0.08, // cartes adversaires plus petites (mais lisibles)
  chevauchement: 0.65, // chevauchement des dos de cartes
  margeNordY: 0.02, // marge haute pour nord (% de la zone de jeu)
  margeCoteX: 0.02, // marge latérale pour est/ouest
} as const;

// --- Zone indicateurs ---
export const INDICATEURS = {
  atoutY: 0.3, // position Y de l'indicateur d'atout (en % hauteur zone de jeu)
} as const;
