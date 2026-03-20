import type { PositionJoueur } from "@belote/shared-types";

import { ADVERSAIRE, POSITIONS_MAINS, RATIO_LARGEUR_CARTE } from "../constants/layout";
import type { PointNormalise } from "./distributionAtlas";

export interface CibleDistributionAtlas {
  arrivee: PointNormalise;
  rotationArrivee: number;
  echelleArrivee: number;
}

const ECHELLE_MAIN_ADVERSE = ADVERSAIRE.ratioLargeurCarte / RATIO_LARGEUR_CARTE;

export function obtenirCibleDistributionAtlas(
  position: PositionJoueur,
): CibleDistributionAtlas {
  if (position === "sud") {
    return {
      arrivee: POSITIONS_MAINS.sud,
      rotationArrivee: 0,
      echelleArrivee: 1,
    };
  }

  if (position === "ouest" || position === "est") {
    return {
      arrivee: POSITIONS_MAINS[position],
      rotationArrivee: 90,
      echelleArrivee: ECHELLE_MAIN_ADVERSE,
    };
  }

  return {
    arrivee: POSITIONS_MAINS.nord,
    rotationArrivee: 0,
    echelleArrivee: ECHELLE_MAIN_ADVERSE,
  };
}
