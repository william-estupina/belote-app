import {
  ANIMATIONS,
  RATIO_ASPECT_CARTE,
  RATIO_LARGEUR_CARTE,
} from "../../constants/layout";

interface DimensionsEcran {
  largeurEcran: number;
  hauteurEcran: number;
}

export interface DispositionReserveCentrale {
  largeurCarte: number;
  hauteurCarte: number;
  espacement: number;
  largeurTotaleAvecCarte: number;
  ancragePaquetX: number;
  centrePaquet: { x: number; y: number };
  centreCarteRetournee: { x: number; y: number };
}

export function calculerDispositionReserveCentrale({
  largeurEcran,
  hauteurEcran,
}: DimensionsEcran): DispositionReserveCentrale {
  const largeurCarte = largeurEcran * RATIO_LARGEUR_CARTE * 0.85;
  const hauteurCarte = largeurCarte * RATIO_ASPECT_CARTE;
  const espacement = 6;
  const largeurTotaleAvecCarte = largeurCarte * 2 + espacement;
  const ancragePaquetX = largeurEcran * 0.5 - largeurTotaleAvecCarte / 2;
  const centreY = hauteurEcran * ANIMATIONS.distribution.originY;

  return {
    largeurCarte,
    hauteurCarte,
    espacement,
    largeurTotaleAvecCarte,
    ancragePaquetX,
    centrePaquet: {
      x: ancragePaquetX + largeurCarte / 2,
      y: centreY,
    },
    centreCarteRetournee: {
      x: ancragePaquetX + largeurCarte + espacement + largeurCarte / 2,
      y: centreY,
    },
  };
}
