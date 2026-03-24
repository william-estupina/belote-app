import type { Carte } from "@belote/shared-types";

import { ANIMATIONS_CARTE_RETOURNEE } from "../constants/animations-visuelles";
import {
  construireTransitionTriMainInitiale,
  DELAI_SUPPLEMENTAIRE_TRI_MAIN_INITIALE_MS,
} from "../hooks/transition-tri-main-initiale";

const MAIN_RECUE: Carte[] = [
  { couleur: "coeur", rang: "7" },
  { couleur: "pique", rang: "as" },
  { couleur: "coeur", rang: "roi" },
  { couleur: "trefle", rang: "10" },
  { couleur: "pique", rang: "9" },
];

const MAIN_TRIEE: Carte[] = [
  { couleur: "pique", rang: "as" },
  { couleur: "pique", rang: "9" },
  { couleur: "coeur", rang: "roi" },
  { couleur: "coeur", rang: "7" },
  { couleur: "trefle", rang: "10" },
];

describe("transitionTriMainInitiale", () => {
  it("garde l ordre de reception avant de declencher le tri apres le flip", () => {
    const transition = construireTransitionTriMainInitiale(MAIN_RECUE, MAIN_TRIEE);

    expect(transition.etatAvantTri).toEqual({
      mainJoueur: MAIN_RECUE,
      triMainDiffere: true,
    });
    expect(transition.etatApresTri).toEqual({
      mainJoueur: MAIN_TRIEE,
      triMainDiffere: false,
    });
  });

  it("attend la fin du retournement puis ajoute un court tampon avant le tri", () => {
    expect(DELAI_SUPPLEMENTAIRE_TRI_MAIN_INITIALE_MS).toBe(
      ANIMATIONS_CARTE_RETOURNEE.delaiFlip + ANIMATIONS_CARTE_RETOURNEE.dureeFlip + 60,
    );
  });
});
