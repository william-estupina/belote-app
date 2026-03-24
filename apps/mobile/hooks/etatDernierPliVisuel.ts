import type { PliComplete } from "@belote/shared-types";

export interface EtatDernierPliVisuel {
  dernierPliVisible: PliComplete | null;
  precedentDernierPliVisible: PliComplete | null;
  transitionDernierPliActive: boolean;
  dureeTransitionDernierPliMs: number;
  cleTransitionDernierPli: number;
}

function creerSignatureDernierPli(dernierPli: PliComplete | null): string {
  if (!dernierPli) {
    return "";
  }

  const cartes = dernierPli.cartes
    .map(({ joueur, carte }) => `${joueur}:${carte.couleur}:${carte.rang}`)
    .join("|");
  return `${dernierPli.gagnant}-${dernierPli.points}-${cartes}`;
}

export function demarrerTransitionDernierPli<T extends EtatDernierPliVisuel>(
  etat: T,
  nouveauDernierPli: PliComplete,
  dureeTransitionDernierPliMs: number,
): T {
  const signatureVisible = creerSignatureDernierPli(etat.dernierPliVisible);
  const signatureNouvelle = creerSignatureDernierPli(nouveauDernierPli);

  if (signatureVisible === signatureNouvelle) {
    return {
      ...etat,
      dernierPliVisible: nouveauDernierPli,
      dureeTransitionDernierPliMs,
    };
  }

  if (!etat.dernierPliVisible) {
    return {
      ...etat,
      dernierPliVisible: nouveauDernierPli,
      precedentDernierPliVisible: null,
      transitionDernierPliActive: false,
      dureeTransitionDernierPliMs,
    };
  }

  return {
    ...etat,
    dernierPliVisible: nouveauDernierPli,
    precedentDernierPliVisible: etat.dernierPliVisible,
    transitionDernierPliActive: true,
    dureeTransitionDernierPliMs,
    cleTransitionDernierPli: etat.cleTransitionDernierPli + 1,
  };
}

export function terminerTransitionDernierPli<T extends EtatDernierPliVisuel>(etat: T): T {
  return {
    ...etat,
    precedentDernierPliVisible: null,
    transitionDernierPliActive: false,
  };
}
