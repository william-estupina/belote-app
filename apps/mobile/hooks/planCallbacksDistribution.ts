import type { Carte, PositionJoueur } from "@belote/shared-types";

export interface DelaiCarteDistribution {
  delai: number;
  duree: number;
}

export interface PaquetDistributionProgramme {
  indexDerniereCarteAtlas: number;
  position: PositionJoueur;
  cartes: Carte[];
}

export interface EvenementPaquetDistribution {
  delaiMs: number;
  position: PositionJoueur;
  cartes: Carte[];
}

export interface PlanCallbacksDistribution {
  evenementsPaquets: EvenementPaquetDistribution[];
  delaiFinDistributionMs: number;
}

export function planifierCallbacksDistribution({
  paquets,
  delaisCartes,
}: {
  paquets: PaquetDistributionProgramme[];
  delaisCartes: DelaiCarteDistribution[];
}): PlanCallbacksDistribution {
  const evenementsPaquets: EvenementPaquetDistribution[] = [];
  let delaiFinDistributionMs = 0;

  for (const paquet of paquets) {
    const delaiCarte = delaisCartes[paquet.indexDerniereCarteAtlas];
    if (!delaiCarte) {
      continue;
    }

    const delaiMs = delaiCarte.delai + delaiCarte.duree;
    evenementsPaquets.push({
      delaiMs,
      position: paquet.position,
      cartes: paquet.cartes,
    });
    delaiFinDistributionMs = Math.max(delaiFinDistributionMs, delaiMs);
  }

  return {
    evenementsPaquets,
    delaiFinDistributionMs,
  };
}
