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
  _suivi: ReturnType<typeof construireSuiviCartes>,
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

/** Calcule les points accumulés par notre équipe dans la manche en cours */
function pointsEquipeManche(vue: VueBotJeu): number {
  let points = 0;
  for (const pli of vue.historiquePlis) {
    if (pli.gagnant === vue.maPosition || pli.gagnant === vue.positionPartenaire) {
      points += pli.points;
    }
  }
  return points;
}

/** Calcule les points adverses dans la manche en cours */
function pointsAdversaireManche(vue: VueBotJeu): number {
  let points = 0;
  for (const pli of vue.historiquePlis) {
    if (pli.gagnant !== vue.maPosition && pli.gagnant !== vue.positionPartenaire) {
      points += pli.points;
    }
  }
  return points;
}

/** Vérifie si c'est le dernier pli de la manche (8e pli = 10 pts bonus) */
function estDernierPli(vue: VueBotJeu): boolean {
  return vue.historiquePlis.length === 7;
}

/** Évalue si l'équipe est en difficulté dans la manche (derrière en points) */
function equipeEnDifficulte(vue: VueBotJeu): boolean {
  const nosPoints = pointsEquipeManche(vue);
  const leursPoints = pointsAdversaireManche(vue);
  // Derrière de 30+ points ou moins de 50 points après 4 plis
  return (
    leursPoints - nosPoints >= 30 || (vue.historiquePlis.length >= 4 && nosPoints < 50)
  );
}

/** Évalue si l'équipe domine la manche (confortablement devant) */
function equipeDominante(vue: VueBotJeu): boolean {
  const nosPoints = pointsEquipeManche(vue);
  return nosPoints >= 120;
}

/** Vérifie si un adversaire a encore des atouts (pas épuisé en atout) */
function adversaireAEncoreDesAtouts(
  suivi: SuiviCartesAvance,
  adversaire: PositionJoueur,
  couleurAtout: Couleur,
): boolean {
  return !suivi.couleursEpuisees[adversaire].includes(couleurAtout);
}

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

/** Entame expert : tirage atout, cartes maîtresses, singletons, adaptation au score */
function entameDifficile(
  vue: VueBotJeu,
  jouables: Carte[],
  suivi: SuiviCartesAvance,
): ActionBot {
  const couleurAtout = vue.couleurAtout!;
  const atoutsJouables = jouables.filter((c) => c.couleur === couleurAtout);
  const horsAtout = jouables.filter((c) => c.couleur !== couleurAtout);
  const adversaires = POSITIONS_JOUEUR.filter(
    (p) => p !== vue.maPosition && p !== vue.positionPartenaire,
  ) as PositionJoueur[];

  // Dernier pli (10 pts bonus) : jouer agressivement pour le gagner
  if (estDernierPli(vue)) {
    // Jouer la carte la plus forte possible
    return { type: "JOUER_CARTE", carte: cartePlusForte(jouables, couleurAtout) };
  }

  // Priorité 1 : Tirage atout — si notre équipe est preneuse et les adversaires ont encore des atouts
  const equipePreneuse =
    vue.positionPreneur === vue.maPosition ||
    vue.positionPreneur === vue.positionPartenaire;
  const atoutsAdv = atoutsRestantsAdversaires(suivi, vue.maMain, vue.positionPartenaire);

  if (equipePreneuse && atoutsAdv > 0 && atoutsJouables.length > 0) {
    // Garder un atout de retour : ne pas tirer son dernier atout si on a des maîtresses hors atout
    const garderAtoutRetour =
      atoutsJouables.length === 1 &&
      horsAtout.some((c) => carteMaitresseAvancee(c, suivi));

    if (!garderAtoutRetour) {
      // Vérifier qu'on a la majorité des atouts restants avant de tirer
      const mesAtouts = atoutsJouables.length;
      if (mesAtouts >= atoutsAdv || mesAtouts >= 2) {
        // Ne pas gaspiller Roi/Dame si la paire Belote existe
        const aRoiDameAtout =
          atoutsJouables.some((c) => c.rang === "roi") &&
          atoutsJouables.some((c) => c.rang === "dame");
        if (aRoiDameAtout) {
          const autresAtouts = atoutsJouables.filter(
            (c) => c.rang !== "roi" && c.rang !== "dame",
          );
          if (autresAtouts.length > 0) {
            return {
              type: "JOUER_CARTE",
              carte: cartePlusForte(autresAtouts, couleurAtout),
            };
          }
        }
        return {
          type: "JOUER_CARTE",
          carte: cartePlusForte(atoutsJouables, couleurAtout),
        };
      }
    }
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

  // Priorité 3 : Forcer la coupe — SEULEMENT si l'adversaire a encore des atouts
  for (const adv of adversaires) {
    for (const c of horsAtout) {
      const couleur = c.couleur;
      if (
        suivi.couleursEpuisees[adv].includes(couleur) &&
        !suivi.couleursEpuisees[vue.positionPartenaire].includes(couleur) &&
        adversaireAEncoreDesAtouts(suivi, adv, couleurAtout)
      ) {
        // Jouer la plus faible de cette couleur pour forcer la coupe adverse
        const cartesCouleurForce = cartesDeCouleur(horsAtout, couleur);
        return {
          type: "JOUER_CARTE",
          carte: cartePlusFaible(cartesCouleurForce, couleurAtout),
        };
      }
    }
  }

  // Priorité 4 : Singleton — jouer une carte seule dans sa couleur (préparer future coupe)
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

/** Quand le partenaire est maître : charger en points si opportun */
function donnerAuPartenaireExpert(
  vue: VueBotJeu,
  jouables: Carte[],
  couleurAtout: Couleur,
  suivi: SuiviCartesAvance,
): ActionBot {
  const horsAtout = jouables.filter((c) => c.couleur !== couleurAtout);

  // Dernier pli : charger au maximum
  if (estDernierPli(vue)) {
    const parPoints = [...jouables].sort(
      (a, b) => getPointsCarte(b, couleurAtout) - getPointsCarte(a, couleurAtout),
    );
    return { type: "JOUER_CARTE", carte: parPoints[0] };
  }

  // Si le pli est sécurisé (partenaire maîtresse OU dernier joueur = nous)
  const pliSecurise = (() => {
    // Partenaire a joué une carte maîtresse → personne ne peut battre
    const cartePartenaire = vue.pliEnCours.find(
      (e) => e.joueur === vue.positionPartenaire,
    );
    if (cartePartenaire && carteMaitresseAvancee(cartePartenaire.carte, suivi)) {
      return true;
    }
    // On est le dernier joueur → pas d'adversaire après nous pour prendre le pli
    if (vue.pliEnCours.length === 3) {
      return true;
    }
    return false;
  })();

  if (pliSecurise) {
    // Charger en points : donner As/10 hors atout
    const cartesChargeables = horsAtout.length > 0 ? horsAtout : jouables;
    const parPoints = [...cartesChargeables].sort(
      (a, b) => getPointsCarte(b, couleurAtout) - getPointsCarte(a, couleurAtout),
    );
    if (getPointsCarte(parPoints[0], couleurAtout) >= 10) {
      return { type: "JOUER_CARTE", carte: parPoints[0] };
    }
  }

  // Équipe en difficulté dans la manche → charger quand même (risque assumé)
  if (equipeEnDifficulte(vue) && horsAtout.length > 0) {
    const parPoints = [...horsAtout].sort(
      (a, b) => getPointsCarte(b, couleurAtout) - getPointsCarte(a, couleurAtout),
    );
    if (getPointsCarte(parPoints[0], couleurAtout) >= 10) {
      return { type: "JOUER_CARTE", carte: parPoints[0] };
    }
  }

  // Jouer la carte la plus faible
  return { type: "JOUER_CARTE", carte: cartePlusFaible(jouables, couleurAtout) };
}

/** Quand l'adversaire est maître : reprendre si possible, sinon économiser ou accepter */
function contrerAdversaireExpert(
  vue: VueBotJeu,
  jouables: Carte[],
  couleurAtout: Couleur,
  suivi: SuiviCartesAvance,
): ActionBot {
  const couleurDemandee = vue.pliEnCours[0].carte.couleur;
  const gagnantActuel = evaluerPli(vue.pliEnCours, couleurAtout);
  const entreeGagnante = vue.pliEnCours.find((e) => e.joueur === gagnantActuel)!;
  const dernierPli = estDernierPli(vue);

  // Calcul des points dans le pli actuel
  let pointsPli = 0;
  for (const e of vue.pliEnCours) {
    pointsPli += getPointsCarte(e.carte, couleurAtout);
  }
  // Ajouter le bonus 10 pts dernier pli dans l'évaluation
  if (dernierPli) {
    pointsPli += 10;
  }

  // 1. Si on a la couleur demandée
  const cartesCouleurDemandee = cartesDeCouleur(jouables, couleurDemandee);
  if (cartesCouleurDemandee.length > 0) {
    // Si le pli est dominé par un atout (coupe), nos cartes hors-atout ne peuvent pas gagner
    const pliDomineParAtout =
      entreeGagnante.carte.couleur === couleurAtout && couleurDemandee !== couleurAtout;

    if (!pliDomineParAtout) {
      const forceABattre = forceCarte(entreeGagnante.carte, couleurAtout);

      // Trouver les cartes qui peuvent effectivement battre la carte gagnante
      const cartesGagnantes = trierParForceCroissante(
        cartesCouleurDemandee.filter((c) => forceCarte(c, couleurAtout) > forceABattre),
        couleurAtout,
      );

      if (cartesGagnantes.length > 0) {
        const plusPetiteGagnante = cartesGagnantes[0];

        // Protéger le 10 hors atout si l'As est encore en jeu et qu'un adversaire joue après
        if (plusPetiteGagnante.rang === "10" && couleurDemandee !== couleurAtout) {
          const asEncoreEnJeu = suivi.cartesRestantes.some(
            (c) => c.couleur === couleurDemandee && c.rang === "as",
          );
          const joueursApresNous = 4 - vue.pliEnCours.length - 1;
          if (asEncoreEnJeu && joueursApresNous > 0 && !dernierPli) {
            // Ne pas gaspiller le 10, jouer la plus faible
            return {
              type: "JOUER_CARTE",
              carte: cartePlusFaible(cartesCouleurDemandee, couleurAtout),
            };
          }
        }

        // Dernier pli ou pli juteux → jouer pour gagner
        return { type: "JOUER_CARTE", carte: plusPetiteGagnante };
      }
    }

    // Impossible de gagner → jouer la plus faible pour économiser
    return {
      type: "JOUER_CARTE",
      carte: cartePlusFaible(cartesCouleurDemandee, couleurAtout),
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

    // Trier les atouts du plus faible au plus fort
    const atoutsTries = trierParForceCroissante(atouts, couleurAtout);

    // Identifier les "petits atouts" (pas le 9 ni le valet)
    const petitsAtouts = atoutsTries.filter((c) => c.rang !== "9" && c.rang !== "valet");

    if (coupExistante) {
      // Sur-coupe : évaluer si ça vaut le coup
      const forceCoupeAdverse = getForceAtout(coupExistante.carte.rang);
      const atoutsSuffisants = atouts
        .filter((c) => getForceAtout(c.rang) > forceCoupeAdverse)
        .sort((a, b) => getForceAtout(a.rang) - getForceAtout(b.rang));

      if (atoutsSuffisants.length > 0) {
        const seuilSurcoupe = dernierPli ? 5 : 15;
        if (pointsPli > seuilSurcoupe) {
          // Sur-couper avec le plus petit atout suffisant, mais économiser 9/valet si possible
          const petitsSuffisants = atoutsSuffisants.filter(
            (c) => c.rang !== "9" && c.rang !== "valet",
          );
          if (petitsSuffisants.length > 0) {
            return { type: "JOUER_CARTE", carte: petitsSuffisants[0] };
          }
          // Pas de petit atout suffisant → utiliser 9/valet seulement si pli très juteux
          if (pointsPli > 30 || dernierPli) {
            return { type: "JOUER_CARTE", carte: atoutsSuffisants[0] };
          }
        }
      }
      // Pas rentable de sur-couper → défausser
    } else {
      // Pas de coupe existante → couper
      // Préférer les petits atouts pour économiser le 9 et le valet
      if (petitsAtouts.length > 0) {
        return { type: "JOUER_CARTE", carte: petitsAtouts[0] };
      }
      // Que des gros atouts (9/valet) → couper seulement si pli juteux ou dernier pli
      if (pointsPli > 15 || dernierPli || equipeEnDifficulte(vue)) {
        return { type: "JOUER_CARTE", carte: atoutsTries[0] };
      }
      // Pli sans valeur et que des gros atouts → ne pas gaspiller, défausser si possible
      const defaussePossible = jouables.filter(
        (c) => c.couleur !== couleurAtout && c.couleur !== couleurDemandee,
      );
      if (defaussePossible.length > 0) {
        // Note : les règles forcent à couper si on a de l'atout et pas la couleur demandée
        // Donc ce cas ne devrait pas arriver (les jouables ne contiennent que des atouts ici)
        // Sécurité : couper quand même
      }
      return { type: "JOUER_CARTE", carte: atoutsTries[0] };
    }
  }

  // 3. Défausse intelligente
  const defausse = jouables.filter((c) => c.couleur !== couleurAtout);
  if (defausse.length > 0) {
    // Préférer les couleurs où le partenaire est épuisé (préparer ses futures coupes)
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
