import type { Carte, PositionJoueur } from "@belote/shared-types";

import type { EtatJeu } from "./useControleurJeu";

export function ajouterCarteAuPliVisuel(
  etat: EtatJeu,
  joueur: PositionJoueur,
  carte: Carte,
): EtatJeu {
  const dejaPresente = etat.pliEnCours.some(
    (entree) =>
      entree.joueur === joueur &&
      entree.carte.couleur === carte.couleur &&
      entree.carte.rang === carte.rang,
  );

  if (dejaPresente) {
    return etat;
  }

  return {
    ...etat,
    pliEnCours: [...etat.pliEnCours, { joueur, carte }],
  };
}
