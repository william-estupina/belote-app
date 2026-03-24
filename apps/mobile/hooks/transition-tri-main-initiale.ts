import type { Carte } from "@belote/shared-types";

import {
  accelererDureeAnimation,
  ANIMATIONS_CARTE_RETOURNEE,
} from "../constants/animations-visuelles";

export interface EtatTransitionTriMainInitiale {
  mainJoueur: Carte[];
  triMainDiffere: boolean;
}

export interface TransitionTriMainInitiale {
  etatAvantTri: EtatTransitionTriMainInitiale;
  etatApresTri: EtatTransitionTriMainInitiale;
}

const TAMPON_APRES_RETOURNEMENT_MS = accelererDureeAnimation(120);

export const DELAI_SUPPLEMENTAIRE_TRI_MAIN_INITIALE_MS =
  ANIMATIONS_CARTE_RETOURNEE.delaiFlip +
  ANIMATIONS_CARTE_RETOURNEE.dureeFlip +
  TAMPON_APRES_RETOURNEMENT_MS;

export function construireTransitionTriMainInitiale(
  mainJoueurVisible: Carte[],
  mainJoueurTriee: Carte[],
): TransitionTriMainInitiale {
  return {
    etatAvantTri: {
      mainJoueur: mainJoueurVisible,
      triMainDiffere: true,
    },
    etatApresTri: {
      mainJoueur: mainJoueurTriee,
      triMainDiffere: false,
    },
  };
}
