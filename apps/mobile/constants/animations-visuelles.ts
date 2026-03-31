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

export function ralentirDelaiPhaseScore(dureeMs: number): number {
  return Math.round(dureeMs * 1.25);
}

/** Raccourci : accelerer puis ralentir (×0.5 × 1.2 = ×0.6) */
export function dureeAnimationMajeure(baseMs: number): number {
  return ralentirDureeAnimationMajeure(accelererDureeAnimation(baseMs));
}

/** Raccourci : accelerer + ralentir + delai score (×0.5 × 1.2 × 1.25 = ×0.75) */
export function delaiPhaseScore(baseMs: number): number {
  return ralentirDelaiPhaseScore(dureeAnimationMajeure(baseMs));
}

/** Raccourci : accelerer + ralentir les tensions (÷0.5 ÷ 1.2) */
export function tensionAnimationMajeure(baseTension: number): number {
  return ralentirTensionAnimationMajeure(accelererTensionAnimation(baseTension));
}

export const DUREE_PULSE_JOUEUR_ACTIF = accelererDureeAnimation(1000);
export const DUREE_FONDU_ENTREE_MAIN = accelererDureeAnimation(100);

export const ANIMATIONS_CARTE_RETOURNEE = {
  dureeFlip: dureeAnimationMajeure(400),
  delaiFlip: dureeAnimationMajeure(200),
} as const;

export const ANIMATIONS_DIALOGUE_FIN_MANCHE = {
  delaiVerdict: delaiPhaseScore(600),
  dureeApparitionVerdict: dureeAnimationMajeure(300),
  delaiDetails: delaiPhaseScore(1400),
  dureeApparitionDetails: dureeAnimationMajeure(300),
  delaiCapot: delaiPhaseScore(2200),
  dureeAnimationCapot: dureeAnimationMajeure(500),
  delaiSectionTotal: delaiPhaseScore(2200),
  dureeApparitionTotal: dureeAnimationMajeure(300),
  delaiComptage: dureeAnimationMajeure(250),
  dureeComptage: 600,
  delaiBoutonApresComptage: delaiPhaseScore(300),
  dureeApparitionBouton: dureeAnimationMajeure(300),
  dureeFonduOverlay: dureeAnimationMajeure(200),
  delaiEntreePanneau: dureeAnimationMajeure(100),
  tensionEntreePanneau: tensionAnimationMajeure(60),
  dureePicEclair: dureeAnimationMajeure(200),
  dureeSortieEclair: dureeAnimationMajeure(300),
} as const;
