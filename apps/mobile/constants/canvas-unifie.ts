// Constantes du canvas Skia unifié — partitions de slots et stride

/** Nombre de valeurs par slot dans le buffer worklet */
export const STRIDE_UNIFIE = 14;

/** Nombre de slots gérés par l'Atlas (hors flip) */
export const MAX_SLOTS_ATLAS = 44;

/** Plage de slots pour un groupe */
export interface GroupeSlots {
  readonly debut: number;
  readonly fin: number;
  readonly taille: number;
}

function creerGroupe(debut: number, fin: number): GroupeSlots {
  return { debut, fin, taille: fin - debut + 1 };
}

/** Piles de plis remportés (1 dos par équipe) */
export const SLOTS_PILES = creerGroupe(0, 1);

/** Réserve centrale (1 dos paquet + 1 carte retournée) */
export const SLOTS_RESERVE = creerGroupe(2, 3);

/** Adversaires (8 cartes × 3 positions) */
export const SLOTS_ADVERSAIRES = creerGroupe(4, 27);

/** Main du joueur sud (8 slots) */
export const SLOTS_MAIN = creerGroupe(28, 35);

/** Animations (distribution sud, vol de jeu, ramassage) */
export const SLOTS_ANIMATIONS = creerGroupe(36, 43);

/** Nombre max de cartes en main */
export const MAX_CARTES_MAIN = 8;

/** Nombre max de cartes adversaires */
export const MAX_CARTES_ADVERSAIRES = 24;

/** Nombre max de slots animation */
export const MAX_SLOTS_ANIMATION = 8;

/** Offsets dans le stride pour chaque valeur */
export const OFFSET = {
  departX: 0,
  departY: 1,
  controleX: 2,
  controleY: 3,
  arriveeX: 4,
  arriveeY: 5,
  rotDepart: 6,
  rotArrivee: 7,
  echDepart: 8,
  echArrivee: 9,
} as const;
