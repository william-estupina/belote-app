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

export const DUREE_PULSE_JOUEUR_ACTIF = accelererDureeAnimation(1000);
export const DUREE_FONDU_ENTREE_MAIN = accelererDureeAnimation(100);

export const ANIMATIONS_CARTE_RETOURNEE = {
  dureeFlip: ralentirDureeAnimationMajeure(accelererDureeAnimation(400)),
  delaiFlip: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
} as const;

export const ANIMATIONS_DIALOGUE_FIN_MANCHE = {
  delaiVerdict: ralentirDureeAnimationMajeure(accelererDureeAnimation(600)),
  dureeApparitionVerdict: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
  delaiDetails: ralentirDureeAnimationMajeure(accelererDureeAnimation(1400)),
  dureeApparitionDetails: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
  delaiCapot: ralentirDureeAnimationMajeure(accelererDureeAnimation(2200)),
  dureeAnimationCapot: ralentirDureeAnimationMajeure(accelererDureeAnimation(500)),
  delaiSectionTotal: ralentirDureeAnimationMajeure(accelererDureeAnimation(2200)),
  dureeApparitionTotal: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
  delaiComptage: ralentirDureeAnimationMajeure(accelererDureeAnimation(250)),
  dureeComptage: 600,
  delaiBoutonApresComptage: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
  dureeApparitionBouton: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
  dureeFonduOverlay: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
  delaiEntreePanneau: ralentirDureeAnimationMajeure(accelererDureeAnimation(100)),
  tensionEntreePanneau: ralentirTensionAnimationMajeure(accelererTensionAnimation(60)),
  dureePicEclair: ralentirDureeAnimationMajeure(accelererDureeAnimation(200)),
  dureeSortieEclair: ralentirDureeAnimationMajeure(accelererDureeAnimation(300)),
} as const;
