export const FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES = 0.5;
export const FACTEUR_RALENTISSEMENT_ANIMATIONS_MAJEURES = 1.2;

export function accelererDureeAnimation(dureeMs: number): number {
  return Math.round(dureeMs * FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES);
}

export function accelererTensionAnimation(tension: number): number {
  return Math.round(tension / FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES);
}

export function ralentirDureeAnimationMajeure(dureeMs: number): number {
  return Math.round(dureeMs * FACTEUR_RALENTISSEMENT_ANIMATIONS_MAJEURES);
}

export function ralentirTensionAnimationMajeure(tension: number): number {
  return Math.round(tension / FACTEUR_RALENTISSEMENT_ANIMATIONS_MAJEURES);
}

export const DUREE_PULSE_JOUEUR_ACTIF = accelererDureeAnimation(700);
export const DUREE_FONDU_ENTREE_MAIN = accelererDureeAnimation(100);

export const ANIMATIONS_CARTE_RETOURNEE = {
  dureeFlip: ralentirDureeAnimationMajeure(accelererDureeAnimation(400)),
  delaiFlip: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
} as const;

export const ANIMATIONS_DIALOGUE_FIN_MANCHE = {
  delaiScoresManche: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
  dureeApparitionManche: ralentirDureeAnimationMajeure(accelererDureeAnimation(400)),
  delaiSectionTotal: ralentirDureeAnimationMajeure(accelererDureeAnimation(800)),
  dureeApparitionTotal: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
  delaiComptage: ralentirDureeAnimationMajeure(accelererDureeAnimation(1200)),
  dureeComptage: ralentirDureeAnimationMajeure(accelererDureeAnimation(800)),
  delaiBouton: ralentirDureeAnimationMajeure(accelererDureeAnimation(2200)),
  dureeApparitionBouton: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
  dureeFonduOverlay: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
  delaiEntreePanneau: ralentirDureeAnimationMajeure(accelererDureeAnimation(100)),
  tensionEntreePanneau: ralentirTensionAnimationMajeure(accelererTensionAnimation(60)),
  dureePicEclair: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
  dureeSortieEclair: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
} as const;
