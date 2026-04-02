import type { Carte } from "@belote/shared-types";

import { trierMainJoueur } from "../hooks/triMainJoueur";

function idsCartes(cartes: Carte[]): string[] {
  return cartes.map((carte) => `${carte.couleur}-${carte.rang}`);
}

describe("trierMainJoueur", () => {
  it("place la couleur retournee tout a gauche sur les 5 premieres cartes puis alterne noir et rouge si possible", () => {
    const main: Carte[] = [
      { couleur: "carreau", rang: "7" },
      { couleur: "pique", rang: "7" },
      { couleur: "coeur", rang: "8" },
      { couleur: "trefle", rang: "dame" },
      { couleur: "carreau", rang: "10" },
      { couleur: "pique", rang: "as" },
      { couleur: "coeur", rang: "roi" },
    ];

    const resultat = trierMainJoueur(main, {
      couleurPrioritaire: "coeur",
    });

    expect(idsCartes(resultat)).toEqual([
      "coeur-roi",
      "coeur-8",
      "pique-as",
      "pique-7",
      "carreau-10",
      "carreau-7",
      "trefle-dame",
    ]);
  });

  it("place l atout reel tout a gauche des qu il est connu et conserve l alternance sur le reste", () => {
    const main: Carte[] = [
      { couleur: "coeur", rang: "as" },
      { couleur: "trefle", rang: "9" },
      { couleur: "pique", rang: "10" },
      { couleur: "carreau", rang: "roi" },
      { couleur: "trefle", rang: "valet" },
    ];

    const resultat = trierMainJoueur(main, {
      couleurPrioritaire: "trefle",
      couleurAtout: "trefle",
    });

    expect(idsCartes(resultat)).toEqual([
      "trefle-valet",
      "trefle-9",
      "coeur-as",
      "pique-10",
      "carreau-roi",
    ]);
  });

  it("privilegie la tete de couleur la plus forte pendant la premiere donne quand plusieurs alternances sont possibles", () => {
    const main: Carte[] = [
      { couleur: "coeur", rang: "roi" },
      { couleur: "coeur", rang: "8" },
      { couleur: "pique", rang: "as" },
      { couleur: "trefle", rang: "8" },
      { couleur: "trefle", rang: "7" },
      { couleur: "carreau", rang: "10" },
    ];

    const resultat = trierMainJoueur(main, {
      couleurPrioritaire: "coeur",
    });

    expect(idsCartes(resultat)).toEqual([
      "coeur-roi",
      "coeur-8",
      "pique-as",
      "carreau-10",
      "trefle-8",
      "trefle-7",
    ]);
  });

  it("privilegie aussi la couleur opposee la plus forte apres l atout reel pendant la donne restante", () => {
    const main: Carte[] = [
      { couleur: "trefle", rang: "valet" },
      { couleur: "trefle", rang: "9" },
      { couleur: "coeur", rang: "as" },
      { couleur: "carreau", rang: "roi" },
      { couleur: "carreau", rang: "dame" },
      { couleur: "pique", rang: "10" },
    ];

    const resultat = trierMainJoueur(main, {
      couleurPrioritaire: "trefle",
      couleurAtout: "trefle",
    });

    expect(idsCartes(resultat)).toEqual([
      "trefle-valet",
      "trefle-9",
      "coeur-as",
      "pique-10",
      "carreau-roi",
      "carreau-dame",
    ]);
  });
});
