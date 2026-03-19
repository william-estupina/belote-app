// Suivi des cartes jouées pour le bot difficile
import type {
  Carte,
  Couleur,
  PliComplete,
  PositionJoueur,
  Rang,
  VueBotJeu,
} from "@belote/shared-types";
import { COULEURS, RANGS } from "@belote/shared-types";

/** Représente le suivi des cartes jouées et restantes */
export interface SuiviCartes {
  /** Cartes qui ont été jouées */
  cartesJouees: Carte[];
  /** Cartes encore en jeu (pas dans la main du bot, pas encore jouées) */
  cartesRestantes: Carte[];
}

/** Suivi avancé des cartes avec détection de coupes et couleurs épuisées */
export interface SuiviCartesAvance extends SuiviCartes {
  /** Couleurs épuisées détectées pour chaque joueur */
  couleursEpuisees: Record<PositionJoueur, Couleur[]>;
  /** Atouts joués par chaque joueur (coupes) */
  atoutsJouesParJoueur: Record<PositionJoueur, Carte[]>;
  /** Nombre total d'atouts restants en jeu (hors main du bot) */
  nombreAtoutsRestantsTotal: number;
  /** Défausses par joueur (ni couleur demandée, ni atout) */
  defaussesParJoueur: Record<PositionJoueur, Carte[]>;
}

/** Crée le paquet complet de 32 cartes */
function creerPaquetComplet(): Carte[] {
  const paquet: Carte[] = [];
  for (const couleur of COULEURS) {
    for (const rang of RANGS) {
      paquet.push({ couleur, rang });
    }
  }
  return paquet;
}

/** Vérifie si deux cartes sont identiques */
function cartesEgales(a: Carte, b: Carte): boolean {
  return a.couleur === b.couleur && a.rang === b.rang;
}

/**
 * Construit le suivi des cartes à partir de l'historique des plis
 * et de la main actuelle du bot.
 */
export function construireSuiviCartes(
  maMain: Carte[],
  historiquePlis: PliComplete[],
  pliEnCours: { joueur: import("@belote/shared-types").PositionJoueur; carte: Carte }[],
): SuiviCartes {
  const toutesLesCartes = creerPaquetComplet();

  // Collecter toutes les cartes jouées
  const cartesJouees: Carte[] = [];

  for (const pli of historiquePlis) {
    for (const { carte } of pli.cartes) {
      cartesJouees.push(carte);
    }
  }

  for (const { carte } of pliEnCours) {
    cartesJouees.push(carte);
  }

  // Les cartes restantes = toutes - jouées - ma main
  const cartesRestantes = toutesLesCartes.filter(
    (carte) =>
      !cartesJouees.some((j) => cartesEgales(j, carte)) &&
      !maMain.some((m) => cartesEgales(m, carte)),
  );

  return { cartesJouees, cartesRestantes };
}

/** Compte les atouts restants en jeu (pas dans la main du bot) */
export function compterAtoutsRestants(suivi: SuiviCartes, couleurAtout: Couleur): number {
  return suivi.cartesRestantes.filter((c) => c.couleur === couleurAtout).length;
}

/** Vérifie si une carte spécifique est encore en jeu */
export function carteEncoreEnJeu(
  suivi: SuiviCartes,
  couleur: Couleur,
  rang: Rang,
): boolean {
  return suivi.cartesRestantes.some((c) => c.couleur === couleur && c.rang === rang);
}

/** Vérifie si une couleur est épuisée chez les adversaires (toutes les cartes jouées ou dans la main) */
export function couleurEpuisee(suivi: SuiviCartes, couleur: Couleur): boolean {
  return suivi.cartesRestantes.filter((c) => c.couleur === couleur).length === 0;
}

/** Retourne les cartes restantes d'une couleur donnée */
export function cartesRestantesDeCouleur(suivi: SuiviCartes, couleur: Couleur): Carte[] {
  return suivi.cartesRestantes.filter((c) => c.couleur === couleur);
}

/**
 * Vérifie si une carte est maîtresse (la plus forte encore en jeu dans sa couleur).
 * Utile pour savoir si un As ou un 10 est sûr de gagner.
 */
export function estCarteMaitresse(
  carte: Carte,
  couleurAtout: Couleur,
  suivi: SuiviCartes,
  maMain: Carte[],
): boolean {
  if (carte.couleur === couleurAtout) {
    // Pour l'atout, vérifier l'ordre atout
    const ordreAtout: Rang[] = ["7", "8", "dame", "roi", "10", "as", "9", "valet"];
    const indexCarte = ordreAtout.indexOf(carte.rang);

    // Vérifier s'il reste des atouts plus forts en jeu (pas dans ma main)
    for (let i = indexCarte + 1; i < ordreAtout.length; i++) {
      const rangSup = ordreAtout[i];
      // Si ce rang supérieur est dans les cartes restantes (chez les adversaires)
      if (carteEncoreEnJeu(suivi, couleurAtout, rangSup)) {
        return false;
      }
    }
    return true;
  }

  // Hors atout : vérifier s'il reste des atouts chez les adversaires
  // Si oui, la carte n'est jamais totalement maîtresse (peut être coupée)
  if (compterAtoutsRestants(suivi, couleurAtout) > 0) {
    // Mais elle est "maîtresse dans sa couleur"
    // On vérifie quand même si elle est la plus forte de sa couleur
  }

  // Vérifier l'ordre hors atout
  const ordreHorsAtout: Rang[] = ["7", "8", "9", "valet", "dame", "roi", "10", "as"];
  const indexCarte = ordreHorsAtout.indexOf(carte.rang);

  for (let i = indexCarte + 1; i < ordreHorsAtout.length; i++) {
    const rangSup = ordreHorsAtout[i];
    if (carteEncoreEnJeu(suivi, carte.couleur, rangSup)) {
      return false;
    }
  }

  return true;
}

/** Initialise un Record vide pour chaque position */
function creerRecordPositions<T>(): Record<PositionJoueur, T[]> {
  return {
    sud: [],
    ouest: [],
    nord: [],
    est: [],
  };
}

/**
 * Construit un suivi avancé des cartes à partir de la vue complète du bot.
 * Analyse l'historique des plis pour détecter les coupes, défausses et couleurs épuisées.
 */
export function construireSuiviAvance(vue: VueBotJeu): SuiviCartesAvance {
  const base = construireSuiviCartes(vue.maMain, vue.historiquePlis, vue.pliEnCours);

  const couleursEpuisees = creerRecordPositions<Couleur>();
  const atoutsJouesParJoueur = creerRecordPositions<Carte>();
  const defaussesParJoueur = creerRecordPositions<Carte>();

  // Analyser tous les plis (historique + en cours)
  const tousPlis: { joueur: PositionJoueur; carte: Carte }[][] = [
    ...vue.historiquePlis.map((p) => p.cartes),
  ];
  if (vue.pliEnCours.length > 0) {
    tousPlis.push(vue.pliEnCours);
  }

  for (const cartesDuPli of tousPlis) {
    if (cartesDuPli.length === 0) continue;

    // La couleur demandée est la couleur de la première carte du pli
    const couleurDemandee = cartesDuPli[0].carte.couleur;

    // Analyser chaque joueur sauf l'entameur
    for (let i = 1; i < cartesDuPli.length; i++) {
      const { joueur, carte } = cartesDuPli[i];
      const couleurJouee = carte.couleur;

      if (couleurJouee !== couleurDemandee) {
        // Le joueur n'a pas fourni → couleur épuisée
        if (!couleursEpuisees[joueur].includes(couleurDemandee)) {
          couleursEpuisees[joueur].push(couleurDemandee);
        }

        if (
          vue.couleurAtout !== null &&
          couleurJouee === vue.couleurAtout &&
          couleurDemandee !== vue.couleurAtout
        ) {
          // C'est une coupe (joue atout sur une autre couleur)
          atoutsJouesParJoueur[joueur].push(carte);
        } else if (couleurJouee !== vue.couleurAtout) {
          // C'est une défausse (ni couleur demandée, ni atout)
          defaussesParJoueur[joueur].push(carte);
        }
      }
    }
  }

  // Compter les atouts restants
  let nombreAtoutsRestantsTotal = 0;
  if (vue.couleurAtout !== null) {
    const atoutCouleur = vue.couleurAtout;
    const atoutsJoues = base.cartesJouees.filter(
      (c) => c.couleur === atoutCouleur,
    ).length;
    const atoutsEnMain = vue.maMain.filter((c) => c.couleur === atoutCouleur).length;
    nombreAtoutsRestantsTotal = 8 - atoutsJoues - atoutsEnMain;
  }

  return {
    ...base,
    couleursEpuisees,
    atoutsJouesParJoueur,
    nombreAtoutsRestantsTotal,
    defaussesParJoueur,
  };
}

/**
 * Vérifie si un joueur a coupé dans une couleur donnée.
 * Un joueur a coupé s'il a la couleur épuisée ET a joué un atout dessus.
 */
export function joueurACoupe(
  suivi: SuiviCartesAvance,
  position: PositionJoueur,
  couleur: Couleur,
): boolean {
  return (
    suivi.couleursEpuisees[position].includes(couleur) &&
    suivi.atoutsJouesParJoueur[position].length > 0
  );
}

/**
 * Retourne le nombre d'atouts restants chez les autres joueurs (partenaire + adversaires).
 * Wrapper autour de nombreAtoutsRestantsTotal pour usage simplifié.
 */
export function atoutsRestantsAdversaires(
  suivi: SuiviCartesAvance,
  _maMain: Carte[],
  _positionPartenaire: PositionJoueur,
): number {
  return suivi.nombreAtoutsRestantsTotal;
}

/**
 * Vérifie si une carte est maîtresse en ne considérant que sa couleur
 * (sans tenir compte de la possibilité de coupe par l'atout).
 * Utilise l'ordre hors-atout : 7, 8, 9, valet, dame, roi, 10, as.
 */
export function carteMaitresseAvancee(carte: Carte, suivi: SuiviCartesAvance): boolean {
  const ordreHorsAtout: Rang[] = ["7", "8", "9", "valet", "dame", "roi", "10", "as"];
  const indexCarte = ordreHorsAtout.indexOf(carte.rang);

  // Vérifier si toutes les cartes plus fortes de la même couleur ont été jouées
  for (let i = indexCarte + 1; i < ordreHorsAtout.length; i++) {
    const rangSup = ordreHorsAtout[i];
    const carteSupJouee = suivi.cartesJouees.some(
      (c) => c.couleur === carte.couleur && c.rang === rangSup,
    );
    if (!carteSupJouee) {
      return false;
    }
  }

  return true;
}
