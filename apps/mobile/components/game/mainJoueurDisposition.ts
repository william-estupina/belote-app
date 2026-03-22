export type ModeDispositionMainJoueur = "eventail" | "reception";

export interface OptionsDispositionMainJoueur {
  mode: ModeDispositionMainJoueur;
  nbCartes: number;
  largeurEcran: number;
  hauteurEcran: number;
  largeurCarte: number;
  hauteurCarte: number;
}

export interface CarteDispositionMainJoueur {
  x: number;
  decalageY: number;
  angle: number;
}

export interface PositionCarteMainJoueurNormalisee {
  x: number;
  y: number;
}

export interface PointAncrageCarteMainJoueurNormalisee {
  x: number;
  y: number;
}

export interface ResultatDispositionMainJoueur {
  cartes: CarteDispositionMainJoueur[];
  hauteurConteneur: number;
}

const CHEVAUCHEMENT_EVENTAIL = 0.55;
const ANGLE_TOTAL_EVENTAIL = 40;
const RATIO_ARC_EVENTAIL = 0.04;

export function calculerDispositionMainJoueur({
  mode,
  nbCartes,
  largeurEcran,
  hauteurEcran,
  largeurCarte,
  hauteurCarte,
}: OptionsDispositionMainJoueur): ResultatDispositionMainJoueur {
  if (nbCartes <= 0) {
    return { cartes: [], hauteurConteneur: 0 };
  }

  if (mode === "reception") {
    return calculerDispositionMainJoueur({
      mode: "eventail",
      nbCartes,
      largeurEcran,
      hauteurEcran,
      largeurCarte,
      hauteurCarte,
    });
  }

  const arcMax = hauteurEcran * RATIO_ARC_EVENTAIL;
  const espacement = largeurCarte * (1 - CHEVAUCHEMENT_EVENTAIL);
  const largeurMain = espacement * (nbCartes - 1) + largeurCarte;
  const xDepart = (largeurEcran - largeurMain) / 2;

  return {
    cartes: Array.from({ length: nbCartes }, (_, index) => {
      const t = nbCartes > 1 ? (index / (nbCartes - 1)) * 2 - 1 : 0;
      return {
        x: xDepart + espacement * index,
        angle: (t * ANGLE_TOTAL_EVENTAIL) / 2,
        decalageY: arcMax * (1 - t * t),
      };
    }),
    hauteurConteneur: hauteurCarte + largeurCarte * 0.2 + arcMax,
  };
}

export function calculerPositionCarteMainJoueurNormalisee({
  x,
  decalageY,
  largeurEcran,
  hauteurEcran,
  largeurCarte,
  hauteurCarte,
}: {
  x: number;
  decalageY: number;
  largeurEcran: number;
  hauteurEcran: number;
  largeurCarte: number;
  hauteurCarte: number;
}): PositionCarteMainJoueurNormalisee {
  return {
    x: (x + largeurCarte / 2) / largeurEcran,
    y: 1 - (decalageY + hauteurCarte / 2 - hauteurCarte * 0.15) / hauteurEcran,
  };
}

export function calculerPointAncrageCarteMainJoueurNormalisee({
  x,
  decalageY,
  largeurEcran,
  hauteurEcran,
  largeurCarte,
  hauteurCarte,
}: {
  x: number;
  decalageY: number;
  largeurEcran: number;
  hauteurEcran: number;
  largeurCarte: number;
  hauteurCarte: number;
}): PointAncrageCarteMainJoueurNormalisee {
  return {
    x: (x + largeurCarte / 2) / largeurEcran,
    y: 1 - (decalageY - hauteurCarte * 0.15) / hauteurEcran,
  };
}
