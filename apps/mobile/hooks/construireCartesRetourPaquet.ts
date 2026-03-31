import type { Carte, PositionJoueur } from "@belote/shared-types";

import {
  calculerDispositionMainJoueur,
  calculerPointAncrageCarteMainJoueurNormalisee,
} from "../components/game/mainJoueurDisposition";
import { ANIMATIONS, RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../constants/layout";
import {
  calculerCiblesEventailAdversaire,
  ECHELLE_MAIN_ADVERSE,
} from "./distributionLayoutAtlas";
import type { CarteRetourPaquet } from "./useAnimations";
import { creerCarteFactice } from "./utils-cartes";

interface DonneesVisiblesRetourPaquet {
  mainJoueur: Carte[];
  nbCartesAdversaires: { nord: number; est: number; ouest: number };
}

/**
 * Construit les cartes de retour vers le paquet pour l'animation de
 * redistribution. Fonction pure extraite de useControleurJeu.
 */
export function construireCartesRetourPaquet(
  etatVisible: DonneesVisiblesRetourPaquet,
  largeurEcran: number,
  hauteurEcran: number,
): CarteRetourPaquet[] {
  if (largeurEcran <= 0 || hauteurEcran <= 0) {
    return [];
  }

  const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
  const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
  const delaiEntreVagues = ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet;

  const dispositionSud = calculerDispositionMainJoueur({
    mode: "eventail",
    nbCartes: etatVisible.mainJoueur.length,
    largeurEcran,
    hauteurEcran,
    largeurCarte,
    hauteurCarte,
  });

  const cartesSud = etatVisible.mainJoueur.map((carte, index) => {
    const positionCarte = dispositionSud.cartes[index];
    if (!positionCarte) return null;

    return {
      carte,
      flipDe: 180,
      flipVers: 0,
      depart: {
        ...calculerPointAncrageCarteMainJoueurNormalisee({
          x: positionCarte.x,
          decalageY: positionCarte.decalageY,
          largeurEcran,
          hauteurEcran,
          largeurCarte,
          hauteurCarte,
        }),
        rotation: positionCarte.angle,
        echelle: 1,
      },
    };
  });

  const cartesParPosition = {
    sud: cartesSud,
    ouest: calculerCiblesEventailAdversaire(
      "ouest",
      0,
      etatVisible.nbCartesAdversaires.ouest,
      etatVisible.nbCartesAdversaires.ouest,
      largeurEcran,
      hauteurEcran,
    ).map((cible, index) => ({
      carte: creerCarteFactice(index),
      depart: {
        x: cible.arrivee.x,
        y: cible.arrivee.y,
        rotation: cible.rotationArrivee,
        echelle: ECHELLE_MAIN_ADVERSE,
      },
    })),
    nord: calculerCiblesEventailAdversaire(
      "nord",
      0,
      etatVisible.nbCartesAdversaires.nord,
      etatVisible.nbCartesAdversaires.nord,
      largeurEcran,
      hauteurEcran,
    ).map((cible, index) => ({
      carte: creerCarteFactice(8 + index),
      depart: {
        x: cible.arrivee.x,
        y: cible.arrivee.y,
        rotation: cible.rotationArrivee,
        echelle: ECHELLE_MAIN_ADVERSE,
      },
    })),
    est: calculerCiblesEventailAdversaire(
      "est",
      0,
      etatVisible.nbCartesAdversaires.est,
      etatVisible.nbCartesAdversaires.est,
      largeurEcran,
      hauteurEcran,
    ).map((cible, index) => ({
      carte: creerCarteFactice(16 + index),
      depart: {
        x: cible.arrivee.x,
        y: cible.arrivee.y,
        rotation: cible.rotationArrivee,
        echelle: ECHELLE_MAIN_ADVERSE,
      },
    })),
  } satisfies Record<PositionJoueur, Array<Omit<CarteRetourPaquet, "delai"> | null>>;

  const nbVagues = Math.max(
    cartesParPosition.sud.length,
    cartesParPosition.ouest.length,
    cartesParPosition.nord.length,
    cartesParPosition.est.length,
  );

  const cartesRetour: CarteRetourPaquet[] = [];
  for (let indexVague = 0; indexVague < nbVagues; indexVague += 1) {
    const delai = indexVague * delaiEntreVagues;

    for (const position of ["sud", "ouest", "nord", "est"] as const) {
      const carte = cartesParPosition[position][indexVague];
      if (!carte) continue;
      cartesRetour.push({ ...carte, delai });
    }
  }

  return cartesRetour;
}
