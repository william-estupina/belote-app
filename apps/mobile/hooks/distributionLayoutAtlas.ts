import type { PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";

import {
  ADVERSAIRE,
  ANIMATIONS,
  POSITIONS_MAINS,
  RATIO_ASPECT_CARTE,
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

export interface CibleCarteEventail {
  arrivee: PointNormalise;
  rotationArrivee: number;
}

/**
 * Calcule les positions individuelles en éventail pour les cartes adversaires,
 * en miroir exact de la disposition de MainAdversaire.
 * Retourne une cible par carte du paquet (indexDebut..indexDebut+nbCartesAPlacer-1).
 */
export function calculerCiblesEventailAdversaire(
  position: "nord" | "est" | "ouest",
  indexDebut: number,
  nbCartesAPlacer: number,
  nbCartesTotal: number,
  largeurEcran: number,
  hauteurEcran: number,
): CibleCarteEventail[] {
  if (position === "nord") {
    return calculerCiblesNord(
      indexDebut,
      nbCartesAPlacer,
      nbCartesTotal,
      largeurEcran,
      hauteurEcran,
    );
  }
  return calculerCiblesVertical(
    position,
    indexDebut,
    nbCartesAPlacer,
    nbCartesTotal,
    largeurEcran,
    hauteurEcran,
  );
}

function calculerCiblesNord(
  indexDebut: number,
  nbCartesAPlacer: number,
  nbCartesTotal: number,
  lE: number,
  hE: number,
): CibleCarteEventail[] {
  const largeurCarte = Math.round(lE * ADVERSAIRE.ratioLargeurCarte);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const espacement = largeurCarte * (1 - ADVERSAIRE.chevauchement);
  const largeurMain = espacement * (nbCartesTotal - 1) + largeurCarte;
  const xDepart = (lE - largeurMain) / 2;
  const containerTop = hE * ADVERSAIRE.margeNordY;
  const arcMax = hE * ADVERSAIRE.decalageArc;

  const resultats: CibleCarteEventail[] = [];
  for (let i = 0; i < nbCartesAPlacer; i++) {
    const index = indexDebut + i;
    const t = nbCartesTotal > 1 ? (index / (nbCartesTotal - 1)) * 2 - 1 : 0;
    const angle = (-t * ADVERSAIRE.angleTotal) / 2;
    const angleRad = (angle * Math.PI) / 180;
    const decalageY = arcMax * (1 - t * t);
    const x = xDepart + espacement * index;

    // Centre de la carte après rotation autour du point haut-centre (transformOrigin)
    const centerX = x + largeurCarte / 2 - (Math.sin(angleRad) * hauteurCarte) / 2;
    const centerY = containerTop + decalageY + (Math.cos(angleRad) * hauteurCarte) / 2;

    resultats.push({
      arrivee: { x: centerX / lE, y: centerY / hE },
      rotationArrivee: angle,
    });
  }
  return resultats;
}

function calculerCiblesVertical(
  cote: "est" | "ouest",
  indexDebut: number,
  nbCartesAPlacer: number,
  nbCartesTotal: number,
  lE: number,
  hE: number,
): CibleCarteEventail[] {
  const largeurCarte = Math.round(lE * ADVERSAIRE.ratioLargeurCarte);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const arcMax = lE * ADVERSAIRE.decalageArc;
  const espacementVisuel = largeurCarte * (1 - ADVERSAIRE.chevauchement);
  const hauteurMain = espacementVisuel * (nbCartesTotal - 1) + largeurCarte;
  const yDepart = (hE - hauteurMain) / 2;
  const estOuest = cote === "ouest";

  const resultats: CibleCarteEventail[] = [];
  for (let i = 0; i < nbCartesAPlacer; i++) {
    const index = indexDebut + i;
    const t = nbCartesTotal > 1 ? (index / (nbCartesTotal - 1)) * 2 - 1 : 0;
    const signeEventail = estOuest ? 1 : -1;
    const angleEventail = (t * ADVERSAIRE.angleTotal * signeEventail) / 2;
    const angleFinal = 90 + angleEventail;
    const decalageX = arcMax * (1 - t * t);
    const y = yDepart + espacementVisuel * index;

    // transformOrigin est au centre, la rotation ne déplace pas le centre
    let centerX: number;
    if (estOuest) {
      // Container left = lE * margeCoteX, carte left = decalageX dans le container
      centerX = lE * ADVERSAIRE.margeCoteX + decalageX + largeurCarte / 2;
    } else {
      // Container right edge = lE - lE * margeCoteX, carte right = decalageX
      centerX = lE * (1 - ADVERSAIRE.margeCoteX) - decalageX - largeurCarte / 2;
    }
    const centerY = y + hauteurCarte / 2;

    resultats.push({
      arrivee: { x: centerX / lE, y: centerY / hE },
      rotationArrivee: angleFinal,
    });
  }
  return resultats;
}
