import type { IdEquipe } from "@belote/shared-types";
import { Platform } from "react-native";

import {
  POSITIONS_PILES,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";

interface OptionsGeometriePilePlis {
  equipe: IdEquipe;
  nbPlis: number;
  largeurEcran: number;
  hauteurEcran: number;
}

interface OptionsCibleAnimationPilePlis {
  equipe: IdEquipe;
  nbPlisAvantRamassage: number;
  largeurEcran: number;
  hauteurEcran: number;
}

export interface GeometriePilePlis {
  estTourne: boolean;
  nbVisibles: number;
  largeurCarte: number;
  hauteurCarte: number;
  largeurVisuelle: number;
  hauteurVisuelle: number;
  hauteurPile: number;
  decalageParPli: number;
  cadrePile: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

const estWeb = Platform.OS === "web";
const FACTEUR_REDUCTION_PILE = 0.65;
const DECALAGE_PAR_PLI = estWeb ? 3 : 2;
const MAX_CARTES_VISIBLES = 8;

export function calculerGeometriePilePlis({
  equipe,
  nbPlis,
  largeurEcran,
  hauteurEcran,
}: OptionsGeometriePilePlis): GeometriePilePlis {
  const pos = POSITIONS_PILES[equipe];
  const largeurCarte = largeurEcran * RATIO_LARGEUR_CARTE * FACTEUR_REDUCTION_PILE;
  const hauteurCarte = largeurCarte * RATIO_ASPECT_CARTE;
  const nbVisibles = Math.min(nbPlis, MAX_CARTES_VISIBLES);
  const estTourne = equipe === "equipe2";
  const largeurVisuelle = estTourne ? hauteurCarte : largeurCarte;
  const hauteurVisuelle = estTourne ? largeurCarte : hauteurCarte;
  const hauteurPile = hauteurVisuelle + nbVisibles * DECALAGE_PAR_PLI;

  return {
    estTourne,
    nbVisibles,
    largeurCarte,
    hauteurCarte,
    largeurVisuelle,
    hauteurVisuelle,
    hauteurPile,
    decalageParPli: DECALAGE_PAR_PLI,
    cadrePile: {
      left: pos.x * largeurEcran - largeurVisuelle / 2,
      top: pos.y * hauteurEcran - hauteurPile + hauteurVisuelle / 2,
      width: largeurVisuelle,
      height: hauteurPile,
    },
  };
}

export function calculerCibleAnimationPilePlis({
  equipe,
  nbPlisAvantRamassage,
  largeurEcran,
  hauteurEcran,
}: OptionsCibleAnimationPilePlis): { x: number; y: number } {
  if (largeurEcran <= 0 || hauteurEcran <= 0) {
    return POSITIONS_PILES[equipe];
  }

  const nbVisiblesApresRamassage = Math.min(
    Math.max(nbPlisAvantRamassage, 0) + 1,
    MAX_CARTES_VISIBLES,
  );
  const indexSommet = nbVisiblesApresRamassage - 1;
  const pos = POSITIONS_PILES[equipe];
  const { hauteurCarte, hauteurVisuelle, decalageParPli } = calculerGeometriePilePlis({
    equipe,
    nbPlis: nbVisiblesApresRamassage,
    largeurEcran,
    hauteurEcran,
  });
  const centreY =
    pos.y * hauteurEcran +
    (hauteurVisuelle - hauteurCarte) / 2 -
    indexSommet * decalageParPli;

  return {
    x: pos.x,
    y: centreY / hauteurEcran,
  };
}
