// Stratégie de jeu de carte par niveau de difficulté
import {
  evaluerPli,
  getCartesJouables,
  getForceAtout,
  getForceHorsAtout,
  getPointsCarte,
} from "@belote/game-logic";
import type {
  ActionBot,
  Carte,
  Couleur,
  Difficulte,
  PositionJoueur,
  VueBotJeu,
} from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";

import type { SuiviCartesAvance } from "./comptage-cartes";
import {
  atoutsRestantsAdversaires,
  carteMaitresseAvancee,
  compterAtoutsRestants,
  construireSuiviAvance,
  construireSuiviCartes,
  couleurEpuisee,
  estCarteMaitresse,
} from "./comptage-cartes";

// ──────────────────────────────────────────────
// Utilitaires
// ──────────────────────────────────────────────

/** Retourne les cartes jouables pour le bot */
function obtenirCartesJouables(vue: VueBotJeu): Carte[] {
  if (vue.couleurAtout === null) {
    return vue.maMain;
  }

  return getCartesJouables(
    vue.maMain,
    vue.pliEnCours,
    vue.couleurAtout,
    vue.positionPartenaire,
  );
}

/** Retourne la force d'une carte (atout ou hors atout) */
function forceCarte(carte: Carte, couleurAtout: Couleur): number {
  if (carte.couleur === couleurAtout) {
    return getForceAtout(carte.rang);
  }
  return getForceHorsAtout(carte.rang);
}

/** Trie les cartes par force décroissante */
function trierParForceDecroissante(cartes: Carte[], couleurAtout: Couleur): Carte[] {
  return [...cartes].sort(
    (a, b) => forceCarte(b, couleurAtout) - forceCarte(a, couleurAtout),
  );
}

/** Trie les cartes par force croissante */
function trierParForceCroissante(cartes: Carte[], couleurAtout: Couleur): Carte[] {
  return [...cartes].sort(
    (a, b) => forceCarte(a, couleurAtout) - forceCarte(b, couleurAtout),
  );
}

/** Vérifie si le partenaire est actuellement maître du pli */
function partenaireMaitrePli(vue: VueBotJeu): boolean {
  if (vue.pliEnCours.length === 0 || vue.couleurAtout === null) {
    return false;
  }

  const gagnantActuel = evaluerPli(vue.pliEnCours, vue.couleurAtout);
  return gagnantActuel === vue.positionPartenaire;
}

/** Vérifie si un adversaire est maître du pli */
function adversaireMaitrePli(vue: VueBotJeu): boolean {
  if (vue.pliEnCours.length === 0 || vue.couleurAtout === null) {
    return false;
  }

  const gagnantActuel = evaluerPli(vue.pliEnCours, vue.couleurAtout);
  return gagnantActuel !== vue.maPosition && gagnantActuel !== vue.positionPartenaire;
}

/** Carte la plus faible en points */
function cartePlusFaible(cartes: Carte[], couleurAtout: Couleur): Carte {
  const triees = trierParForceCroissante(cartes, couleurAtout);
  return triees[0];
}

/** Carte la plus forte en points */
function cartePlusForte(cartes: Carte[], couleurAtout: Couleur): Carte {
  const triees = trierParForceDecroissante(cartes, couleurAtout);
  return triees[0];
}

/** Filtre les cartes d'une couleur */
function cartesDeCouleur(cartes: Carte[], couleur: Couleur): Carte[] {
  return cartes.filter((c) => c.couleur === couleur);
}

/** Filtre les As hors atout */
function asHorsAtout(cartes: Carte[], couleurAtout: Couleur): Carte[] {
  return cartes.filter((c) => c.couleur !== couleurAtout && c.rang === "as");
}

// ──────────────────────────────────────────────
// Bot facile : heuristiques de base (ancien moyen)
// ──────────────────────────────────────────────

function jouerFacile(vue: VueBotJeu): ActionBot {
  const jouables = obtenirCartesJouables(vue);
  const couleurAtout = vue.couleurAtout!;

  // Un seul choix possible
  if (jouables.length === 1) {
    return { type: "JOUER_CARTE", carte: jouables[0] };
  }

  // Entame (premier joueur du pli)
  if (vue.pliEnCours.length === 0) {
    return entameMoyen(jouables, couleurAtout);
  }

  // Partenaire est maître → jouer le plus faible
  if (partenaireMaitrePli(vue)) {
    return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
  }

  // Adversaire est maître → essayer de gagner le pli
  if (adversaireMaitrePli(vue)) {
    return { type: "JOUER_CARTE", carte: cartePlusForte(jouables, couleurAtout) };
  }

  // Position neutre → jouer la plus forte
  return { type: "JOUER_CARTE", carte: cartePlusForte(jouables, couleurAtout) };
}

/** Entame pour le bot facile (heuristiques de base) */
function entameMoyen(jouables: Carte[], couleurAtout: Couleur): ActionBot {
  // Entamer avec un As hors atout si disponible
  const as = asHorsAtout(jouables, couleurAtout);
  if (as.length > 0) {
    return { type: "JOUER_CARTE", carte: as[0] };
  }

  // Sinon entamer avec la carte la plus forte hors atout
  const horsAtout = jouables.filter((c) => c.couleur !== couleurAtout);
  if (horsAtout.length > 0) {
    const plusForte = cartePlusForte(horsAtout, couleurAtout);
    return { type: "JOUER_CARTE", carte: plusForte };
  }

  // Si on n'a que de l'atout, jouer le plus faible
  return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
}

// ──────────────────────────────────────────────
// Bot moyen : comptage de cartes + stratégie avancée (ancien difficile)
// ──────────────────────────────────────────────

function jouerMoyen(vue: VueBotJeu): ActionBot {
  const jouables = obtenirCartesJouables(vue);
  const couleurAtout = vue.couleurAtout!;

  // Un seul choix possible
  if (jouables.length === 1) {
    return { type: "JOUER_CARTE", carte: jouables[0] };
  }

  const suivi = construireSuiviCartes(vue.maMain, vue.historiquePlis, vue.pliEnCours);

  // Entame
  if (vue.pliEnCours.length === 0) {
    return entameMoyenAvancee(jouables, couleurAtout, vue, suivi);
  }

  // Partenaire est maître → jouer le plus faible (donner des points si possible)
  if (partenaireMaitrePli(vue)) {
    return donnerAuPartenaireMoyen(jouables, couleurAtout);
  }

  // Adversaire est maître → essayer de gagner intelligemment
  if (adversaireMaitrePli(vue)) {
    return contrerAdversaireMoyen(jouables, couleurAtout, vue, suivi);
  }

  // Position neutre → jouer la plus forte
  return { type: "JOUER_CARTE", carte: cartePlusForte(jouables, couleurAtout) };
}

/** Entame pour le bot moyen avec comptage de cartes */
function entameMoyenAvancee(
  jouables: Carte[],
  couleurAtout: Couleur,
  vue: VueBotJeu,
  suivi: ReturnType<typeof construireSuiviCartes>,
): ActionBot {
  // Jouer une carte maîtresse hors atout pour ramasser des points
  const horsAtout = jouables.filter((c) => c.couleur !== couleurAtout);

  for (const carte of horsAtout) {
    if (estCarteMaitresse(carte, couleurAtout, suivi, vue.maMain)) {
      return { type: "JOUER_CARTE", carte };
    }
  }

  // Entamer avec un As hors atout si pas trop risqué
  const as = asHorsAtout(jouables, couleurAtout);
  if (as.length > 0) {
    // Vérifier si la couleur est encore présente chez les adversaires
    // (sinon l'As pourrait être coupé)
    for (const ace of as) {
      const restantes = compterAtoutsRestants(suivi, couleurAtout);
      // Si peu d'atouts restants, l'As est plus sûr
      if (restantes <= 2 || !couleurEpuisee(suivi, ace.couleur)) {
        return { type: "JOUER_CARTE", carte: ace };
      }
    }
    // Jouer le premier As quand même
    return { type: "JOUER_CARTE", carte: as[0] };
  }

  // Faire tomber les atouts adverses si on a le Valet ou le 9 d'atout
  const atouts = jouables.filter((c) => c.couleur === couleurAtout);
  const atoutsRestants = compterAtoutsRestants(suivi, couleurAtout);
  if (atouts.length > 0 && atoutsRestants > 0) {
    const aValetOuNeuf = atouts.some((c) => c.rang === "valet" || c.rang === "9");
    if (aValetOuNeuf) {
      return { type: "JOUER_CARTE", carte: cartePlusForte(atouts, couleurAtout) };
    }
  }

  // Sinon jouer la carte la plus forte hors atout
  if (horsAtout.length > 0) {
    return { type: "JOUER_CARTE", carte: cartePlusForte(horsAtout, couleurAtout) };
  }

  // Dernier recours : le plus faible atout
  return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
}

/** Quand le partenaire est maître : donner des points si possible */
function donnerAuPartenaireMoyen(jouables: Carte[], couleurAtout: Couleur): ActionBot {
  // Donner la carte avec le plus de points parmi les jouables
  // (mais préférer ne pas gâcher un atout fort)
  const horsAtout = jouables.filter((c) => c.couleur !== couleurAtout);

  if (horsAtout.length > 0) {
    // Trier par points décroissants pour donner le max
    const parPoints = [...horsAtout].sort(
      (a, b) => getPointsCarte(b, couleurAtout) - getPointsCarte(a, couleurAtout),
    );
    // Donner un 10 ou un As pour maximiser les points
    if (getPointsCarte(parPoints[0], couleurAtout) >= 10) {
      return { type: "JOUER_CARTE", carte: parPoints[0] };
    }
  }

  // Sinon jouer le plus faible
  return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
}

/** Quand l'adversaire est maître : essayer de reprendre le pli */
function contrerAdversaireMoyen(
  jouables: Carte[],
  couleurAtout: Couleur,
  vue: VueBotJeu,
  suivi: ReturnType<typeof construireSuiviCartes>,
): ActionBot {
  const couleurDemandee = vue.pliEnCours[0].carte.couleur;

  // Si on a la couleur demandée, jouer la plus forte pour tenter de gagner
  const cartesCouleur = cartesDeCouleur(jouables, couleurDemandee);
  if (cartesCouleur.length > 0) {
    // Vérifier si on peut gagner avec la plus forte
    const plusForte = cartePlusForte(cartesCouleur, couleurAtout);
    return { type: "JOUER_CARTE", carte: plusForte };
  }

  // Si on doit couper, couper avec le plus petit atout suffisant
  const atouts = cartesDeCouleur(jouables, couleurAtout);
  if (atouts.length > 0) {
    // Couper avec le plus petit atout possible
    return { type: "JOUER_CARTE", carte: cartePlusFaible(atouts, couleurAtout) };
  }

  // Défausser la carte avec le moins de points
  const parPoints = [...jouables].sort(
    (a, b) => getPointsCarte(a, couleurAtout) - getPointsCarte(b, couleurAtout),
  );
  return { type: "JOUER_CARTE", carte: parPoints[0] };
}

// ──────────────────────────────────────────────
// Bot difficile : stratégie expert complète
// ──────────────────────────────────────────────

function jouerDifficile(vue: VueBotJeu): ActionBot {
  const jouables = obtenirCartesJouables(vue);
  const couleurAtout = vue.couleurAtout!;

  if (jouables.length === 1) {
    return { type: "JOUER_CARTE", carte: jouables[0] };
  }

  const suivi = construireSuiviAvance(vue);

  // Entame
  if (vue.pliEnCours.length === 0) {
    return entameDifficile(vue, jouables, suivi);
  }

  // Partenaire est maître
  if (partenaireMaitrePli(vue)) {
    return donnerAuPartenaireExpert(vue, jouables, couleurAtout, suivi);
  }

  // Adversaire est maître
  if (adversaireMaitrePli(vue)) {
    return contrerAdversaireExpert(vue, jouables, couleurAtout, suivi);
  }

  // Position neutre → jouer la plus forte
  return { type: "JOUER_CARTE", carte: cartePlusForte(jouables, couleurAtout) };
}

/** Entame expert : tirage atout, cartes maîtresses, singletons */
function entameDifficile(
  vue: VueBotJeu,
  jouables: Carte[],
  suivi: SuiviCartesAvance,
): ActionBot {
  const couleurAtout = vue.couleurAtout!;
  const atoutsJouables = jouables.filter((c) => c.couleur === couleurAtout);
  const horsAtout = jouables.filter((c) => c.couleur !== couleurAtout);

  // Priorité 1 : Tirage atout — si notre équipe est preneuse et les adversaires ont encore des atouts
  const equipePreneuse =
    vue.positionPreneur === vue.maPosition ||
    vue.positionPreneur === vue.positionPartenaire;
  const atoutsAdv = atoutsRestantsAdversaires(suivi, vue.maMain, vue.positionPartenaire);

  if (equipePreneuse && atoutsAdv > 0 && atoutsJouables.length > 0) {
    // Ne pas gaspiller Roi/Dame si la paire Belote existe
    const aRoiDameAtout =
      atoutsJouables.some((c) => c.rang === "roi") &&
      atoutsJouables.some((c) => c.rang === "dame");
    if (aRoiDameAtout) {
      // Jouer un autre atout si disponible, pas roi/dame
      const autresAtouts = atoutsJouables.filter(
        (c) => c.rang !== "roi" && c.rang !== "dame",
      );
      if (autresAtouts.length > 0) {
        return { type: "JOUER_CARTE", carte: cartePlusForte(autresAtouts, couleurAtout) };
      }
    }
    return { type: "JOUER_CARTE", carte: cartePlusForte(atoutsJouables, couleurAtout) };
  }

  // Priorité 2 : Jouer une carte maîtresse hors atout
  for (const c of horsAtout) {
    if (carteMaitresseAvancee(c, suivi)) {
      // Préférer si le partenaire n'est pas épuisé dans cette couleur
      if (!suivi.couleursEpuisees[vue.positionPartenaire].includes(c.couleur)) {
        return { type: "JOUER_CARTE", carte: c };
      }
    }
  }
  // Même si partenaire épuisé, jouer la maîtresse quand même
  for (const c of horsAtout) {
    if (carteMaitresseAvancee(c, suivi)) {
      return { type: "JOUER_CARTE", carte: c };
    }
  }

  // Priorité 3 : Forcer la coupe — chercher couleur où un adversaire est épuisé
  const adversaires = POSITIONS_JOUEUR.filter(
    (p) => p !== vue.maPosition && p !== vue.positionPartenaire,
  ) as PositionJoueur[];

  for (const adv of adversaires) {
    for (const c of horsAtout) {
      const couleur = c.couleur;
      if (
        suivi.couleursEpuisees[adv].includes(couleur) &&
        !suivi.couleursEpuisees[vue.positionPartenaire].includes(couleur)
      ) {
        // Jouer la plus faible de cette couleur pour forcer la coupe adverse
        const cartesCouleur = cartesDeCouleur(horsAtout, couleur);
        return {
          type: "JOUER_CARTE",
          carte: cartePlusFaible(cartesCouleur, couleurAtout),
        };
      }
    }
  }

  // Priorité 4 : Singleton — jouer une carte seule dans sa couleur
  const couleursHorsAtout = new Map<Couleur, Carte[]>();
  for (const c of horsAtout) {
    if (!couleursHorsAtout.has(c.couleur)) couleursHorsAtout.set(c.couleur, []);
    couleursHorsAtout.get(c.couleur)!.push(c);
  }
  for (const [, cartes] of couleursHorsAtout) {
    if (cartes.length === 1) {
      return { type: "JOUER_CARTE", carte: cartes[0] };
    }
  }

  // Priorité 5 : Défaut — plus faible carte de la couleur la plus longue
  if (horsAtout.length > 0) {
    let plusLongue: Carte[] = [];
    for (const [, cartes] of couleursHorsAtout) {
      if (cartes.length > plusLongue.length) plusLongue = cartes;
    }
    if (plusLongue.length > 0) {
      return { type: "JOUER_CARTE", carte: cartePlusFaible(plusLongue, couleurAtout) };
    }
    return { type: "JOUER_CARTE", carte: cartePlusFaible(horsAtout, couleurAtout) };
  }

  return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
}

/** Quand le partenaire est maître : charger en points si maîtresse, sinon jouer faible */
function donnerAuPartenaireExpert(
  vue: VueBotJeu,
  jouables: Carte[],
  couleurAtout: Couleur,
  suivi: SuiviCartesAvance,
): ActionBot {
  // Si partenaire a joué une carte maîtresse, charger en points
  if (vue.pliEnCours.length > 0) {
    const cartePartenaire = vue.pliEnCours.find(
      (e) => e.joueur === vue.positionPartenaire,
    );
    if (cartePartenaire && carteMaitresseAvancee(cartePartenaire.carte, suivi)) {
      // Donner les cartes avec le plus de points
      const parPoints = [...jouables].sort(
        (a, b) => getPointsCarte(b, couleurAtout) - getPointsCarte(a, couleurAtout),
      );
      if (getPointsCarte(parPoints[0], couleurAtout) >= 10) {
        return { type: "JOUER_CARTE", carte: parPoints[0] };
      }
    }
  }

  // Jouer la carte la plus faible
  return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
}

/** Quand l'adversaire est maître : couper intelligemment ou défausser */
function contrerAdversaireExpert(
  vue: VueBotJeu,
  jouables: Carte[],
  couleurAtout: Couleur,
  suivi: SuiviCartesAvance,
): ActionBot {
  const couleurDemandee = vue.pliEnCours[0].carte.couleur;

  // 1. Si on a la couleur demandée, jouer la plus forte pour tenter de gagner
  const cartesCouleurDemandee = cartesDeCouleur(jouables, couleurDemandee);
  if (cartesCouleurDemandee.length > 0) {
    return {
      type: "JOUER_CARTE",
      carte: cartePlusForte(cartesCouleurDemandee, couleurAtout),
    };
  }

  // 2. Si on a des atouts et peut couper
  const atouts = cartesDeCouleur(jouables, couleurAtout);
  if (atouts.length > 0) {
    // Vérifier si un adversaire a déjà coupé
    const coupExistante = vue.pliEnCours.find((e) => {
      const estAdversaire =
        e.joueur !== vue.maPosition && e.joueur !== vue.positionPartenaire;
      return (
        estAdversaire &&
        e.carte.couleur === couleurAtout &&
        couleurDemandee !== couleurAtout
      );
    });

    if (coupExistante) {
      // Évaluer la sur-coupe : compter les points dans le pli
      let pointsPli = 0;
      for (const e of vue.pliEnCours) {
        pointsPli += getPointsCarte(e.carte, couleurAtout);
      }

      // Trouver le plus petit atout qui bat la coupe existante
      const forceCoupeAdverse = getForceAtout(coupExistante.carte.rang);
      const atoutsSuffisants = atouts
        .filter((c) => getForceAtout(c.rang) > forceCoupeAdverse)
        .sort((a, b) => getForceAtout(a.rang) - getForceAtout(b.rang));

      if (pointsPli > 15 && atoutsSuffisants.length > 0) {
        // Sur-couper avec le plus petit atout suffisant
        return { type: "JOUER_CARTE", carte: atoutsSuffisants[0] };
      }
      // Pas rentable de sur-couper → défausser
    } else {
      // Pas de coupe existante → couper avec le plus petit atout
      const atoutsTries = trierParForceCroissante(atouts, couleurAtout);
      return { type: "JOUER_CARTE", carte: atoutsTries[0] };
    }
  }

  // 3. Défausse intelligente — préférer couleurs épuisées pour le partenaire (futures coupes)
  const defausse = jouables.filter((c) => c.couleur !== couleurAtout);
  if (defausse.length > 0) {
    // Préférer les couleurs où le partenaire est épuisé
    const couleurPartenaireEpuisee = defausse.filter((c) =>
      suivi.couleursEpuisees[vue.positionPartenaire].includes(c.couleur),
    );
    if (couleurPartenaireEpuisee.length > 0) {
      return {
        type: "JOUER_CARTE",
        carte: cartePlusFaible(couleurPartenaireEpuisee, couleurAtout),
      };
    }
    // Sinon défausser le moins de points possible
    const parPoints = [...defausse].sort(
      (a, b) => getPointsCarte(a, couleurAtout) - getPointsCarte(b, couleurAtout),
    );
    return { type: "JOUER_CARTE", carte: parPoints[0] };
  }

  // Dernier recours
  return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
}

// ──────────────────────────────────────────────
// Point d'entrée
// ──────────────────────────────────────────────

/** Décide de la carte à jouer selon le niveau de difficulté */
export function deciderJeu(vue: VueBotJeu, difficulte: Difficulte): ActionBot {
  switch (difficulte) {
    case "facile":
      return jouerFacile(vue);
    case "moyen":
      return jouerMoyen(vue);
    case "difficile":
      return jouerDifficile(vue);
  }
}
