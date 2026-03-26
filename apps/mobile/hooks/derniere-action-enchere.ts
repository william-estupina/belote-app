import type { ActionEnchere, PositionJoueur } from "@belote/shared-types";

const NB_JOUEURS = 4;

export function construireDerniereActionParJoueur(
  historiqueEncheres: ReadonlyArray<ActionEnchere>,
  phaseEncheres: "encheres1" | "encheres2" | null,
  joueurActif: PositionJoueur | null,
): Map<PositionJoueur, ActionEnchere> {
  if (phaseEncheres === "encheres2") {
    const actionsTour1 = historiqueEncheres.slice(0, NB_JOUEURS);
    const actionsTour2 = historiqueEncheres.slice(NB_JOUEURS);

    const actionsParJoueur = new Map<PositionJoueur, ActionEnchere>();

    // Garder les bulles du tour 1 pour les joueurs qui n'ont pas encore
    // reparlé au tour 2 et dont ce n'est pas le tour
    const joueursDejaParleTour2 = new Set(actionsTour2.map((a) => a.joueur));

    for (const action of actionsTour1) {
      if (!joueursDejaParleTour2.has(action.joueur) && action.joueur !== joueurActif) {
        actionsParJoueur.set(action.joueur, action);
      }
    }

    // Écraser avec les actions du tour 2
    for (const action of actionsTour2) {
      actionsParJoueur.set(action.joueur, action);
    }

    return actionsParJoueur;
  }

  const actionsParJoueur = new Map<PositionJoueur, ActionEnchere>();

  for (const action of historiqueEncheres) {
    actionsParJoueur.set(action.joueur, action);
  }

  return actionsParJoueur;
}
