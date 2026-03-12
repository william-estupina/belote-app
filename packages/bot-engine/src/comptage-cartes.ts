// Suivi des cartes jouées pour le bot difficile
import type { Carte, Couleur, PliComplete, Rang } from "@belote/shared-types";
import { COULEURS, RANGS } from "@belote/shared-types";

/** Représente le suivi des cartes jouées et restantes */
export interface SuiviCartes {
  /** Cartes qui ont été jouées */
  cartesJouees: Carte[];
  /** Cartes encore en jeu (pas dans la main du bot, pas encore jouées) */
  cartesRestantes: Carte[];
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
