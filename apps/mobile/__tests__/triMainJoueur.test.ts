import type { Carte } from "@belote/shared-types";

import { trierMainJoueur } from "../hooks/triMainJoueur";

function idsCartes(cartes: Carte[]): string[] {
  return cartes.map((carte) => `${carte.couleur}-${carte.rang}`);
}

describe("trierMainJoueur", () => {
  it("respecte l ordre de couleur historique pique coeur carreau trefle quand aucune couleur n est prioritaire", () => {
    const main: Carte[] = [
      { couleur: "trefle", rang: "as" },
      { couleur: "carreau", rang: "roi" },
      { couleur: "coeur", rang: "10" },
      { couleur: "pique", rang: "7" },
      { couleur: "trefle", rang: "valet" },
    ];

    const resultat = trierMainJoueur(main);

    expect(idsCartes(resultat)).toEqual([
      "pique-7",
      "coeur-10",
      "carreau-roi",
      "trefle-as",
      "trefle-valet",
    ]);
  });

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

  it("garde toute la couleur prioritaire a gauche puis conserve l alternance historique des couleurs", () => {
    const main: Carte[] = [
      { couleur: "coeur", rang: "roi" },
      { couleur: "coeur", rang: "8" },
      { couleur: "pique", rang: "7" },
      { couleur: "trefle", rang: "as" },
      { couleur: "carreau", rang: "10" },
    ];

    const resultat = trierMainJoueur(main, {
      couleurPrioritaire: "coeur",
    });

    expect(idsCartes(resultat)).toEqual([
      "coeur-roi",
      "coeur-8",
      "pique-7",
      "carreau-10",
      "trefle-as",
    ]);
  });

  it("aligne aussi l ordre restant apres l atout sur la vision historique react", () => {
    const main: Carte[] = [
      { couleur: "coeur", rang: "valet" },
      { couleur: "coeur", rang: "9" },
      { couleur: "pique", rang: "7" },
      { couleur: "carreau", rang: "roi" },
      { couleur: "trefle", rang: "as" },
    ];

    const resultat = trierMainJoueur(main, {
      couleurPrioritaire: "coeur",
      couleurAtout: "coeur",
    });

    expect(idsCartes(resultat)).toEqual([
      "coeur-valet",
      "coeur-9",
      "pique-7",
      "carreau-roi",
      "trefle-as",
    ]);
  });
});
