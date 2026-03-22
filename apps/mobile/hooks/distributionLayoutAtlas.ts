import type { PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";

import {
  ADVERSAIRE,
  ANIMATIONS,
  POSITIONS_MAINS,
  RATIO_LARGEUR_CARTE,
} from "../constants/layout";
import type { PointNormalise } from "./distributionAtlas";

export interface CibleDistributionAtlas {
  arrivee: PointNormalise;
  rotationArrivee: number;
  echelleArrivee: number;
}

const ECHELLE_MAIN_ADVERSE = ADVERSAIRE.ratioLargeurCarte / RATIO_LARGEUR_CARTE;
const FACTEUR_RAPPROCHEMENT_DONNEUR = 0.55;

function normaliserIndexJoueur(indexJoueur: number): number {
  const totalJoueurs = POSITIONS_JOUEUR.length;
  return ((indexJoueur % totalJoueurs) + totalJoueurs) % totalJoueurs;
}

function interpolerPoint(
  depart: PointNormalise,
  arrivee: PointNormalise,
  facteur: number,
): PointNormalise {
  return {
    x: depart.x + (arrivee.x - depart.x) * facteur,
    y: depart.y + (arrivee.y - depart.y) * facteur,
  };
}

export function obtenirPremierServi(indexDonneur: number): PositionJoueur {
  return POSITIONS_JOUEUR[
    (normaliserIndexJoueur(indexDonneur) + 3) % POSITIONS_JOUEUR.length
  ];
}

export function obtenirOrdreDistribution(indexDonneur: number): PositionJoueur[] {
  const premierServi = obtenirPremierServi(indexDonneur);
  const indexPremierServi = POSITIONS_JOUEUR.indexOf(premierServi);

  return POSITIONS_JOUEUR.map(
    (_, offset) =>
      POSITIONS_JOUEUR[
        (indexPremierServi - offset + POSITIONS_JOUEUR.length) % POSITIONS_JOUEUR.length
      ],
  );
}

export function obtenirOrigineDistribution(indexDonneur: number): PointNormalise {
  const positionDonneur = POSITIONS_JOUEUR[normaliserIndexJoueur(indexDonneur)];
  const pointDonneur = POSITIONS_MAINS[positionDonneur];
  const origineCentrale: PointNormalise = {
    x: ANIMATIONS.distribution.originX,
    y: ANIMATIONS.distribution.originY,
  };

  return interpolerPoint(origineCentrale, pointDonneur, FACTEUR_RAPPROCHEMENT_DONNEUR);
}

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
