// Règles : cartes jouables (fournir, couper, monter, défausser)
import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";

import { getForceAtout, getForceHorsAtout } from "./pli";

/**
 * Retourne les cartes jouables depuis la main du joueur.
 */
export function getCartesJouables(
  main: Carte[],
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[],
  couleurAtout: Couleur,
  positionPartenaire: PositionJoueur,
): Carte[] {
  // Premier joueur du pli : tout est jouable
  if (pliEnCours.length === 0) {
    return main;
  }

  const couleurDemandee = pliEnCours[0].carte.couleur;
  const cartesCouleurDemandee = main.filter((c) => c.couleur === couleurDemandee);

  // 1. Fournir : si on a la couleur demandée
  if (cartesCouleurDemandee.length > 0) {
    // Si la couleur demandée est l'atout, on doit monter si possible
    if (couleurDemandee === couleurAtout) {
      return appliquerObligationMonter(
        cartesCouleurDemandee,
        pliEnCours,
        couleurAtout,
        main,
      );
    }
    return cartesCouleurDemandee;
  }

  // 2. On n'a pas la couleur demandée
  const cartesAtout = main.filter((c) => c.couleur === couleurAtout);

  // Vérifier si le partenaire est maître du pli
  const partenaireMaitre = estPartenaireMaitre(
    pliEnCours,
    couleurAtout,
    positionPartenaire,
  );

  if (cartesAtout.length > 0) {
    if (partenaireMaitre) {
      // Partenaire maître : on peut défausser OU couper (au choix)
      return main;
    }
    // On doit couper, et monter si possible
    return appliquerObligationMonter(cartesAtout, pliEnCours, couleurAtout, main);
  }

  // 3. Défausser : ni la couleur ni l'atout
  return main;
}

/** Obligation de monter à l'atout */
function appliquerObligationMonter(
  cartesAtout: Carte[],
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[],
  couleurAtout: Couleur,
  mainComplete: Carte[],
): Carte[] {
  const plusFortAtoutDansPli = getPlusFortAtoutDansPli(pliEnCours, couleurAtout);

  if (plusFortAtoutDansPli === -1) {
    // Pas d'atout dans le pli, n'importe quel atout convient
    return cartesAtout;
  }

  const atoutsSuperieurs = cartesAtout.filter(
    (c) => getForceAtout(c.rang) > plusFortAtoutDansPli,
  );

  // Si on peut monter, on doit monter
  if (atoutsSuperieurs.length > 0) {
    return atoutsSuperieurs;
  }

  // Sinon on peut "pisser" (jouer un atout inférieur)
  // Si on fournit à l'atout, on doit quand même jouer de l'atout
  if (cartesAtout.length > 0 && cartesAtout[0].couleur === couleurAtout) {
    return cartesAtout;
  }

  // Obligation de couper même si on ne peut pas monter
  return cartesAtout.length > 0 ? cartesAtout : mainComplete;
}

function getPlusFortAtoutDansPli(
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[],
  couleurAtout: Couleur,
): number {
  let plusFort = -1;
  for (const { carte } of pliEnCours) {
    if (carte.couleur === couleurAtout) {
      const force = getForceAtout(carte.rang);
      if (force > plusFort) {
        plusFort = force;
      }
    }
  }
  return plusFort;
}

function estPartenaireMaitre(
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[],
  couleurAtout: Couleur,
  positionPartenaire: PositionJoueur,
): boolean {
  if (pliEnCours.length === 0) return false;

  const couleurDemandee = pliEnCours[0].carte.couleur;
  let indexMaitre = 0;

  for (let i = 1; i < pliEnCours.length; i++) {
    const carteMaitre = pliEnCours[indexMaitre].carte;
    const carteAdverse = pliEnCours[i].carte;

    if (carteAdverse.couleur === couleurAtout && carteMaitre.couleur !== couleurAtout) {
      indexMaitre = i;
    } else if (
      carteAdverse.couleur === couleurAtout &&
      carteMaitre.couleur === couleurAtout
    ) {
      if (getForceAtout(carteAdverse.rang) > getForceAtout(carteMaitre.rang)) {
        indexMaitre = i;
      }
    } else if (
      carteAdverse.couleur === couleurDemandee &&
      carteMaitre.couleur === couleurDemandee
    ) {
      if (getForceHorsAtout(carteAdverse.rang) > getForceHorsAtout(carteMaitre.rang)) {
        indexMaitre = i;
      }
    }
  }

  return pliEnCours[indexMaitre].joueur === positionPartenaire;
}
