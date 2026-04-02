export interface EtatCarteAnimee {
  x: number;
  y: number;
  rotation: number;
  echelle: number;
}

export interface GlissementCarte {
  depart: EtatCarteAnimee;
  controle: {
    x: number;
    y: number;
  };
  arrivee: EtatCarteAnimee;
}

export function construireGlissementCarteDepuisEtatCourant({
  depart,
  arrivee,
}: {
  depart: EtatCarteAnimee;
  arrivee: EtatCarteAnimee;
}): GlissementCarte {
  return {
    depart,
    controle: {
      x: (depart.x + arrivee.x) / 2,
      y: (depart.y + arrivee.y) / 2,
    },
    arrivee,
  };
}
