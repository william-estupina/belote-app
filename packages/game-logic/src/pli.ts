// Évaluation du pli : qui gagne ?
import type { Carte, Couleur, PositionJoueur, Rang } from "@belote/shared-types";

/** Force des cartes à l'atout (plus = plus fort) */
export function getForceAtout(rang: Rang): number {
  const ordre: Record<Rang, number> = {
    "7": 0,
    "8": 1,
    "9": 6,
    "10": 4,
    valet: 7,
    dame: 2,
    roi: 3,
    as: 5,
  };
  return ordre[rang];
}

/** Force des cartes hors atout (plus = plus fort) */
export function getForceHorsAtout(rang: Rang): number {
  const ordre: Record<Rang, number> = {
    "7": 0,
    "8": 1,
    "9": 2,
    valet: 3,
    dame: 4,
    roi: 5,
    "10": 6,
    as: 7,
  };
  return ordre[rang];
}

/**
 * Détermine le gagnant d'un pli complet (4 cartes).
 */
export function evaluerPli(
  pli: { joueur: PositionJoueur; carte: Carte }[],
  couleurAtout: Couleur,
): PositionJoueur {
  const couleurDemandee = pli[0].carte.couleur;
  let indexGagnant = 0;

  for (let i = 1; i < pli.length; i++) {
    const carteGagnante = pli[indexGagnant].carte;
    const carteAdverse = pli[i].carte;

    if (carteAdverse.couleur === couleurAtout && carteGagnante.couleur !== couleurAtout) {
      // L'atout bat toujours une carte hors atout
      indexGagnant = i;
    } else if (
      carteAdverse.couleur === couleurAtout &&
      carteGagnante.couleur === couleurAtout
    ) {
      // Deux atouts : le plus fort gagne
      if (getForceAtout(carteAdverse.rang) > getForceAtout(carteGagnante.rang)) {
        indexGagnant = i;
      }
    } else if (
      carteAdverse.couleur === couleurDemandee &&
      carteGagnante.couleur === couleurDemandee
    ) {
      // Même couleur (hors atout) : le plus fort gagne
      if (
        carteGagnante.couleur !== couleurAtout &&
        getForceHorsAtout(carteAdverse.rang) > getForceHorsAtout(carteGagnante.rang)
      ) {
        indexGagnant = i;
      }
    }
    // Sinon : carte d'une autre couleur (ni atout ni couleur demandée) → ne gagne pas
  }

  return pli[indexGagnant].joueur;
}
