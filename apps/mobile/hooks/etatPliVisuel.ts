import type { Carte, PositionJoueur } from "@belote/shared-types";

interface EtatAvecPli {
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[];
}

export function ajouterCarteAuPliVisuel<T extends EtatAvecPli>(
  etat: T,
  joueur: PositionJoueur,
  carte: Carte,
): T {
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
