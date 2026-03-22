import type { EtatJeu } from "./useControleurJeu";

export function appliquerEtatVerrouillePendantFinPli(
  precedent: EtatJeu,
  nouvelEtat: Partial<EtatJeu>,
  pliVisible?: EtatJeu["pliEnCours"],
): EtatJeu {
  return {
    ...precedent,
    ...nouvelEtat,
    phaseUI: "finPli",
    estTourHumain: false,
    cartesJouables: [],
    pliEnCours: pliVisible ?? precedent.pliEnCours,
    plisEquipe1: precedent.plisEquipe1,
    plisEquipe2: precedent.plisEquipe2,
  };
}
