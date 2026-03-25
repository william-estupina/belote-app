import type { ActionEnchere, PositionJoueur } from "@belote/shared-types";

const NB_JOUEURS = 4;

export function construireDerniereActionParJoueur(
  historiqueEncheres: ReadonlyArray<ActionEnchere>,
  phaseEncheres: "encheres1" | "encheres2" | null,
): Map<PositionJoueur, ActionEnchere> {
  const actionsDuTourCourant =
    phaseEncheres === "encheres2"
      ? historiqueEncheres.slice(NB_JOUEURS)
      : historiqueEncheres;

  const actionsParJoueur = new Map<PositionJoueur, ActionEnchere>();

  for (const action of actionsDuTourCourant) {
    actionsParJoueur.set(action.joueur, action);
  }

  return actionsParJoueur;
}
