// Stratégie d'enchères par niveau de difficulté
import { getPointsAtout, getPointsHorsAtout } from "@belote/game-logic";
import type {
  ActionBot,
  Carte,
  Couleur,
  Difficulte,
  VueBotJeu,
} from "@belote/shared-types";

/** Compte le nombre de cartes d'une couleur dans la main */
function compterCouleur(main: Carte[], couleur: Couleur): number {
  return main.filter((c) => c.couleur === couleur).length;
}

/** Vérifie si la main contient le valet d'atout */
function aValetAtout(main: Carte[], couleur: Couleur): boolean {
  return main.some((c) => c.couleur === couleur && c.rang === "valet");
}

/** Vérifie si la main contient le 9 d'atout */
function aNeufAtout(main: Carte[], couleur: Couleur): boolean {
  return main.some((c) => c.couleur === couleur && c.rang === "9");
}

/** Compte le nombre d'As hors atout */
function compterAsHorsAtout(main: Carte[], couleurAtout: Couleur): number {
  return main.filter((c) => c.couleur !== couleurAtout && c.rang === "as").length;
}

/**
 * Estime les points potentiels si une couleur est atout.
 * Compte les points des cartes d'atout + les As hors atout.
 */
function estimerPointsPotentiels(main: Carte[], couleurAtout: Couleur): number {
  let points = 0;

  for (const carte of main) {
    if (carte.couleur === couleurAtout) {
      points += getPointsAtout(carte.rang);
    } else if (carte.rang === "as") {
      // Un As hors atout rapporte ses points
      points += getPointsHorsAtout(carte.rang);
    } else if (carte.rang === "10") {
      // Un 10 hors atout rapporte aussi mais moins sûr
      points += getPointsHorsAtout(carte.rang) / 2;
    }
  }

  return points;
}

/** Inverse la décision avec une probabilité de 12% (taux d'erreur bot facile) */
function avecErreurAleatoire(action: ActionBot): ActionBot {
  if (Math.random() < 0.12) {
    // Inverser la décision
    if (action.type === "PRENDRE") {
      return { type: "PASSER" };
    }
    if (action.type === "PASSER") {
      return { type: "PRENDRE" };
    }
    // Pour ANNONCER, on passe
    if (action.type === "ANNONCER") {
      return { type: "PASSER" };
    }
  }
  return action;
}

/** Inverse la décision tour 2 avec une probabilité de 12% */
function avecErreurAleatoireTour2(
  action: ActionBot,
  couleurOriginale: Couleur | null,
): ActionBot {
  if (Math.random() < 0.12) {
    if (action.type === "ANNONCER") {
      return { type: "PASSER" };
    }
    if (action.type === "PASSER" && couleurOriginale !== null) {
      return { type: "ANNONCER", couleur: couleurOriginale };
    }
  }
  return action;
}

// ──────────────────────────────────────────────
// Enchères tour 1 : prendre la retourne ou passer
// ──────────────────────────────────────────────

/** Bot facile : heuristiques (ancien moyen) + 12% d'erreur aléatoire */
function encheresFacileTour1(vue: VueBotJeu): ActionBot {
  if (vue.carteRetournee === null) {
    return { type: "PASSER" };
  }

  const couleurRetournee = vue.carteRetournee.couleur;
  const nombreAtouts = compterCouleur(vue.maMain, couleurRetournee);
  const aValet = aValetAtout(vue.maMain, couleurRetournee);
  const aNeuf = aNeufAtout(vue.maMain, couleurRetournee);
  const nombreAs = compterAsHorsAtout(vue.maMain, couleurRetournee);

  let decision: ActionBot;

  // Valet + 9 d'atout = excellente main, prendre sans hésiter
  if (aValet && aNeuf) {
    decision = { type: "PRENDRE" };
  }
  // Valet d'atout + 2 autres atouts ou un As = bonne main
  else if (aValet && (nombreAtouts >= 2 || nombreAs >= 1)) {
    decision = { type: "PRENDRE" };
  }
  // 3+ atouts avec des points significatifs
  else if (nombreAtouts >= 3 && (aValet || aNeuf)) {
    decision = { type: "PRENDRE" };
  }
  // 4+ atouts même sans le valet/9
  else if (nombreAtouts >= 4) {
    decision = { type: "PRENDRE" };
  } else {
    decision = { type: "PASSER" };
  }

  return avecErreurAleatoire(decision);
}

/** Bot moyen : compte les points potentiels (ancien difficile) */
function encheresMoyenTour1(vue: VueBotJeu): ActionBot {
  if (vue.carteRetournee === null) {
    return { type: "PASSER" };
  }

  const couleurRetournee = vue.carteRetournee.couleur;
  const nombreAtouts = compterCouleur(vue.maMain, couleurRetournee);
  const pointsPotentiels = estimerPointsPotentiels(vue.maMain, couleurRetournee);
  const aValet = aValetAtout(vue.maMain, couleurRetournee);
  const aNeuf = aNeufAtout(vue.maMain, couleurRetournee);

  // Ajouter les points de la carte retournée (qu'on récupérera)
  const pointsRetournee = getPointsAtout(vue.carteRetournee.rang);
  const pointsTotal = pointsPotentiels + pointsRetournee;

  // Prend si les points estimés dépassent 82 de 5+ points
  // ET qu'on a au moins 2 atouts (avec la retourne ça fera 3)
  if (pointsTotal >= 87 && nombreAtouts >= 2) {
    return { type: "PRENDRE" };
  }

  // Valet + 9 : toujours prendre (combinaison trop forte)
  if (aValet && aNeuf) {
    return { type: "PRENDRE" };
  }

  // Valet d'atout + bons points
  if (aValet && pointsTotal >= 82) {
    return { type: "PRENDRE" };
  }

  return { type: "PASSER" };
}

/** Bot difficile : stub en attente d'implémentation expert */
function encheresDifficileTour1(_vue: VueBotJeu): ActionBot {
  return { type: "PASSER" };
}

// ──────────────────────────────────────────────
// Enchères tour 2 : proposer une autre couleur ou passer
// ──────────────────────────────────────────────

const TOUTES_COULEURS: readonly Couleur[] = ["pique", "coeur", "carreau", "trefle"];

/** Trouve la meilleure couleur à proposer (exclut la couleur de la retourne) */
function trouverMeilleureCouleur(
  main: Carte[],
  couleurExclue: Couleur,
): { couleur: Couleur; nombreAtouts: number; points: number } | null {
  let meilleure: { couleur: Couleur; nombreAtouts: number; points: number } | null = null;

  for (const couleur of TOUTES_COULEURS) {
    if (couleur === couleurExclue) continue;

    const nombreAtouts = compterCouleur(main, couleur);
    const points = estimerPointsPotentiels(main, couleur);

    if (
      meilleure === null ||
      points > meilleure.points ||
      (points === meilleure.points && nombreAtouts > meilleure.nombreAtouts)
    ) {
      meilleure = { couleur, nombreAtouts, points };
    }
  }

  return meilleure;
}

/** Bot facile tour 2 : heuristiques (ancien moyen) + 12% d'erreur */
function encheresFacileTour2(vue: VueBotJeu): ActionBot {
  if (vue.carteRetournee === null) {
    return { type: "PASSER" };
  }

  const couleurExclue = vue.carteRetournee.couleur;
  const meilleure = trouverMeilleureCouleur(vue.maMain, couleurExclue);

  if (meilleure === null) {
    return { type: "PASSER" };
  }

  const aValet = aValetAtout(vue.maMain, meilleure.couleur);
  const aNeuf = aNeufAtout(vue.maMain, meilleure.couleur);

  let decision: ActionBot;

  // Valet + 9 ou 4+ atouts
  if ((aValet && aNeuf) || meilleure.nombreAtouts >= 4) {
    decision = { type: "ANNONCER", couleur: meilleure.couleur };
  }
  // Valet + 2 atouts
  else if (aValet && meilleure.nombreAtouts >= 2) {
    decision = { type: "ANNONCER", couleur: meilleure.couleur };
  } else {
    decision = { type: "PASSER" };
  }

  return avecErreurAleatoireTour2(decision, meilleure.couleur);
}

/** Bot moyen tour 2 : analyse fine des points potentiels (ancien difficile) */
function encheresMoyenTour2(vue: VueBotJeu): ActionBot {
  if (vue.carteRetournee === null) {
    return { type: "PASSER" };
  }

  const couleurExclue = vue.carteRetournee.couleur;
  const meilleure = trouverMeilleureCouleur(vue.maMain, couleurExclue);

  if (meilleure === null) {
    return { type: "PASSER" };
  }

  // Prend si points estimés ≥ 87 et au moins 3 atouts
  if (meilleure.points >= 87 && meilleure.nombreAtouts >= 3) {
    return { type: "ANNONCER", couleur: meilleure.couleur };
  }

  const aValet = aValetAtout(vue.maMain, meilleure.couleur);
  const aNeuf = aNeufAtout(vue.maMain, meilleure.couleur);

  // Valet + 9 toujours bon
  if (aValet && aNeuf) {
    return { type: "ANNONCER", couleur: meilleure.couleur };
  }

  // Valet + bons points
  if (aValet && meilleure.points >= 82) {
    return { type: "ANNONCER", couleur: meilleure.couleur };
  }

  return { type: "PASSER" };
}

/** Bot difficile tour 2 : stub en attente d'implémentation expert */
function encheresDifficileTour2(_vue: VueBotJeu): ActionBot {
  return { type: "PASSER" };
}

// ──────────────────────────────────────────────
// Point d'entrée
// ──────────────────────────────────────────────

/** Décide de l'action d'enchère selon le niveau de difficulté */
export function deciderEncheres(vue: VueBotJeu, difficulte: Difficulte): ActionBot {
  if (vue.phaseJeu === "encheres1") {
    switch (difficulte) {
      case "facile":
        return encheresFacileTour1(vue);
      case "moyen":
        return encheresMoyenTour1(vue);
      case "difficile":
        return encheresDifficileTour1(vue);
    }
  }

  // encheres2
  switch (difficulte) {
    case "facile":
      return encheresFacileTour2(vue);
    case "moyen":
      return encheresMoyenTour2(vue);
    case "difficile":
      return encheresDifficileTour2(vue);
  }
}
