export const FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES = 0.5;

export function accelererDureeAnimation(dureeMs: number): number {
  return Math.round(dureeMs * FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES);
}

export function accelererTensionAnimation(tension: number): number {
  return Math.round(tension / FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES);
}

export const DUREE_PULSE_JOUEUR_ACTIF = accelererDureeAnimation(700);
export const DUREE_FONDU_ENTREE_MAIN = accelererDureeAnimation(100);

export const ANIMATIONS_CARTE_RETOURNEE = {
  dureeFlip: accelererDureeAnimation(400),
  delaiFlip: accelererDureeAnimation(200),
} as const;

export const ANIMATIONS_DIALOGUE_FIN_MANCHE = {
  delaiScoresManche: accelererDureeAnimation(200),
  dureeApparitionManche: accelererDureeAnimation(400),
  delaiSectionTotal: accelererDureeAnimation(800),
  dureeApparitionTotal: accelererDureeAnimation(300),
  delaiComptage: accelererDureeAnimation(1200),
  dureeComptage: accelererDureeAnimation(800),
  delaiBouton: accelererDureeAnimation(2200),
  dureeApparitionBouton: accelererDureeAnimation(300),
  dureeFonduOverlay: accelererDureeAnimation(200),
  delaiEntreePanneau: accelererDureeAnimation(100),
  dureePicEclair: accelererDureeAnimation(200),
  dureeSortieEclair: accelererDureeAnimation(300),
} as const;
