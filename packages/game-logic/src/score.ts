// Comptage des points, Belote/Rebelote, Dix de der, Capot, chute
import type { Carte, Couleur, Rang } from "@belote/shared-types";

/** Points d'une carte à l'atout */
export function getPointsAtout(rang: Rang): number {
  const points: Record<Rang, number> = {
    "7": 0,
    "8": 0,
    "9": 14,
    "10": 10,
    valet: 20,
    dame: 3,
    roi: 4,
    as: 11,
  };
  return points[rang];
}

/** Points d'une carte hors atout */
export function getPointsHorsAtout(rang: Rang): number {
  const points: Record<Rang, number> = {
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 10,
    valet: 2,
    dame: 3,
    roi: 4,
    as: 11,
  };
  return points[rang];
}

/** Points d'une carte selon qu'elle est atout ou non */
export function getPointsCarte(carte: Carte, couleurAtout: Couleur): number {
  if (carte.couleur === couleurAtout) {
    return getPointsAtout(carte.rang);
  }
  return getPointsHorsAtout(carte.rang);
}

/** Points d'un pli */
export function getPointsPli(cartes: Carte[], couleurAtout: Couleur): number {
  return cartes.reduce((somme, carte) => somme + getPointsCarte(carte, couleurAtout), 0);
}

/** Entrée pour le calcul du score de la manche */
export interface EntreeScoreManche {
  pointsEquipePreneur: number;
  pointsEquipeDefenseur: number;
  plisEquipePreneur: number;
  plisEquipeDefenseur: number;
  dernierPliPreneur: boolean;
  belotePreneur: boolean;
  beloteDefenseur: boolean;
}

/** Résultat du score de la manche */
export interface ResultatScoreManche {
  scorePreneur: number;
  scoreDefenseur: number;
  estCapot: boolean;
  estChute: boolean;
}

export function calculerScoreManche(entree: EntreeScoreManche): ResultatScoreManche {
  let pointsPreneur = entree.pointsEquipePreneur;
  let pointsDefenseur = entree.pointsEquipeDefenseur;

  // Dix de der (10 points au dernier pli)
  if (entree.dernierPliPreneur) {
    pointsPreneur += 10;
  } else {
    pointsDefenseur += 10;
  }

  const belotePreneur = entree.belotePreneur ? 20 : 0;
  const beloteDefenseur = entree.beloteDefenseur ? 20 : 0;

  // Capot
  if (entree.plisEquipePreneur === 8) {
    return {
      scorePreneur: 252 + belotePreneur,
      scoreDefenseur: 0 + beloteDefenseur,
      estCapot: true,
      estChute: false,
    };
  }

  if (entree.plisEquipeDefenseur === 8) {
    return {
      scorePreneur: 0 + belotePreneur,
      scoreDefenseur: 252 + beloteDefenseur,
      estCapot: true,
      estChute: false,
    };
  }

  // Chute : le preneur n'atteint pas 82 points
  if (pointsPreneur < 82) {
    return {
      scorePreneur: 0 + belotePreneur,
      scoreDefenseur: 252 + beloteDefenseur,
      estChute: true,
      estCapot: false,
    };
  }

  // Contrat rempli
  return {
    scorePreneur: pointsPreneur + belotePreneur,
    scoreDefenseur: pointsDefenseur + beloteDefenseur,
    estChute: false,
    estCapot: false,
  };
}
