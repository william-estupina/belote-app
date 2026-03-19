// Stratégie d'enchères par niveau de difficulté
import { getPointsAtout, getPointsHorsAtout } from "@belote/game-logic";
import type {
  ActionBot,
  Carte,
  Couleur,
  Difficulte,
  VueBotJeu,
} from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";

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

/** Compte le nombre de couleurs couvertes hors atout (As ou 3+ cartes) */
function compterCouleursCouvertes(main: Carte[], couleurAtout: Couleur): number {
  const couleurs: Couleur[] = ["pique", "coeur", "carreau", "trefle"];
  let couvertes = 0;
  for (const couleur of couleurs) {
    if (couleur === couleurAtout) continue;
    const aAs = main.some((c) => c.couleur === couleur && c.rang === "as");
    const nombreCartes = compterCouleur(main, couleur);
    if (aAs || nombreCartes >= 3) {
      couvertes++;
    }
  }
  return couvertes;
}

/** Vérifie si la main contient Roi + Dame d'atout (belote/rebelote) */
function aBeloteRebelote(main: Carte[], couleurAtout: Couleur): boolean {
  const aRoi = main.some((c) => c.couleur === couleurAtout && c.rang === "roi");
  const aDame = main.some((c) => c.couleur === couleurAtout && c.rang === "dame");
  return aRoi && aDame;
}

/** Calcule la position relative du bot par rapport au donneur (0-3) */
function calculerPositionRelative(maPosition: string, positionDonneur: string): number {
  const indexBot = POSITIONS_JOUEUR.indexOf(
    maPosition as (typeof POSITIONS_JOUEUR)[number],
  );
  const indexDonneur = POSITIONS_JOUEUR.indexOf(
    positionDonneur as (typeof POSITIONS_JOUEUR)[number],
  );
  return (indexBot - indexDonneur + 4) % 4;
}

/** Bot difficile tour 1 : logique expert avec anti-chute et seuil adaptatif */
function encheresDifficileTour1(vue: VueBotJeu): ActionBot {
  if (vue.carteRetournee === null) {
    return { type: "PASSER" };
  }

  const couleurRetournee = vue.carteRetournee.couleur;
  const nombreAtouts = compterCouleur(vue.maMain, couleurRetournee);
  const aValet = aValetAtout(vue.maMain, couleurRetournee);
  const aNeuf = aNeufAtout(vue.maMain, couleurRetournee);

  // Calcul des points d'atout (main + carte retournée)
  let pointsAtout = 0;
  for (const c of vue.maMain) {
    if (c.couleur === couleurRetournee) {
      pointsAtout += getPointsAtout(c.rang);
    }
  }
  pointsAtout += getPointsAtout(vue.carteRetournee.rang);

  // Calcul des points hors atout (As plein, 10 demi)
  let pointsHorsAtout = 0;
  for (const c of vue.maMain) {
    if (c.couleur !== couleurRetournee) {
      if (c.rang === "as") {
        pointsHorsAtout += getPointsHorsAtout(c.rang);
      } else if (c.rang === "10") {
        pointsHorsAtout += getPointsHorsAtout(c.rang) / 2;
      }
    }
  }

  // Bonus belote/rebelote (+20 pts)
  const belote = aBeloteRebelote(vue.maMain, couleurRetournee);
  const bonusBelote = belote ? 20 : 0;

  const pointsTotal = pointsAtout + pointsHorsAtout + bonusBelote;

  // Couleurs couvertes hors atout
  const couleursCouvertes = compterCouleursCouvertes(vue.maMain, couleurRetournee);

  // Anti-chute : sans V+9, il faut au moins 2 couleurs couvertes et 2 atouts
  if (!aValet || !aNeuf) {
    if (couleursCouvertes < 2) {
      return { type: "PASSER" };
    }
    if (nombreAtouts < 2) {
      return { type: "PASSER" };
    }
  }

  // Auto-prend : V+9 est une combinaison trop forte
  if (aValet && aNeuf) {
    return { type: "PRENDRE" };
  }

  // Seuil adaptatif
  let seuil = 87;

  // Bonus de position : donneur (pos 0, dernier à parler) ou 3e position
  const posRelative = calculerPositionRelative(vue.maPosition, vue.positionDonneur);
  if (posRelative === 0 || posRelative === 3) {
    seuil -= 7;
  }

  // Bonus si écart de score important
  if (Math.abs(vue.scoreMonEquipe - vue.scoreAdversaire) > 200) {
    seuil -= 5;
  }

  // Main suffisamment forte en points avec au moins 2 atouts
  if (pointsTotal >= seuil && nombreAtouts >= 2) {
    return { type: "PRENDRE" };
  }

  // Bonus valet : seuil réduit de 5
  if (aValet && pointsTotal >= seuil - 5) {
    return { type: "PRENDRE" };
  }

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

/** Bot difficile tour 2 : logique expert avec seuil adaptatif */
function encheresDifficileTour2(vue: VueBotJeu): ActionBot {
  if (vue.carteRetournee === null) {
    return { type: "PASSER" };
  }

  const couleurExclue = vue.carteRetournee.couleur;
  const couleursCandidates: Couleur[] = (
    ["pique", "coeur", "carreau", "trefle"] as Couleur[]
  ).filter((c) => c !== couleurExclue);

  let meilleureAction: ActionBot = { type: "PASSER" };
  let meilleurPoints = -1;

  for (const couleurCandidate of couleursCandidates) {
    const nombreAtouts = compterCouleur(vue.maMain, couleurCandidate);
    const aValet = aValetAtout(vue.maMain, couleurCandidate);
    const aNeuf = aNeufAtout(vue.maMain, couleurCandidate);

    // Calcul des points d'atout (pas de carte retournée au tour 2)
    let pointsAtout = 0;
    for (const c of vue.maMain) {
      if (c.couleur === couleurCandidate) {
        pointsAtout += getPointsAtout(c.rang);
      }
    }

    // Calcul des points hors atout
    let pointsHorsAtout = 0;
    for (const c of vue.maMain) {
      if (c.couleur !== couleurCandidate) {
        if (c.rang === "as") {
          pointsHorsAtout += getPointsHorsAtout(c.rang);
        } else if (c.rang === "10") {
          pointsHorsAtout += getPointsHorsAtout(c.rang) / 2;
        }
      }
    }

    // Bonus belote/rebelote
    const belote = aBeloteRebelote(vue.maMain, couleurCandidate);
    const bonusBelote = belote ? 20 : 0;

    const pointsTotal = pointsAtout + pointsHorsAtout + bonusBelote;

    // Couleurs couvertes
    const couleursCouvertes = compterCouleursCouvertes(vue.maMain, couleurCandidate);

    // Auto-prend : V+9 dans la couleur candidate
    if (aValet && aNeuf) {
      if (pointsTotal > meilleurPoints) {
        meilleurPoints = pointsTotal;
        meilleureAction = { type: "ANNONCER", couleur: couleurCandidate };
      }
      continue;
    }

    // Main longue : 4+ cartes avec V ou 9 → auto-annonce
    if (nombreAtouts >= 4 && (aValet || aNeuf)) {
      if (pointsTotal > meilleurPoints) {
        meilleurPoints = pointsTotal;
        meilleureAction = { type: "ANNONCER", couleur: couleurCandidate };
      }
      continue;
    }

    // Anti-chute : sans V+9, il faut 2 couleurs couvertes et 2+ atouts
    if (couleursCouvertes < 2 || nombreAtouts < 2) {
      continue;
    }

    // Seuil adaptatif (tour 2 : base 92, prime de risque +5)
    let seuil = 92;

    // Bonus de position
    const posRelative = calculerPositionRelative(vue.maPosition, vue.positionDonneur);
    if (posRelative === 0 || posRelative === 3) {
      seuil -= 7;
    }

    // Bonus si écart de score important
    if (Math.abs(vue.scoreMonEquipe - vue.scoreAdversaire) > 200) {
      seuil -= 5;
    }

    // Main suffisamment forte
    if (pointsTotal >= seuil && nombreAtouts >= 2) {
      if (pointsTotal > meilleurPoints) {
        meilleurPoints = pointsTotal;
        meilleureAction = { type: "ANNONCER", couleur: couleurCandidate };
      }
    }

    // Bonus valet
    if (aValet && pointsTotal >= seuil - 5 && pointsTotal > meilleurPoints) {
      meilleurPoints = pointsTotal;
      meilleureAction = { type: "ANNONCER", couleur: couleurCandidate };
    }
  }

  return meilleureAction;
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
