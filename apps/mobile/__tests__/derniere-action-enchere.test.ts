import type { ActionEnchere } from "@belote/shared-types";

import { construireDerniereActionParJoueur } from "../hooks/derniere-action-enchere";

describe("construireDerniereActionParJoueur", () => {
  it("ignore les reponses du premier tour tant qu'un joueur n'a pas encore parle au deuxieme", () => {
    const historiqueEncheres: ActionEnchere[] = [
      { type: "PASSER", joueur: "sud" },
      { type: "PASSER", joueur: "ouest" },
      { type: "PASSER", joueur: "nord" },
      { type: "PASSER", joueur: "est" },
      { type: "PASSER", joueur: "sud" },
      { type: "ANNONCER", joueur: "ouest", couleur: "coeur" },
    ];

    const derniereActionParJoueur = construireDerniereActionParJoueur(
      historiqueEncheres,
      "encheres2",
    );

    expect(derniereActionParJoueur.get("sud")).toEqual({
      type: "PASSER",
      joueur: "sud",
    });
    expect(derniereActionParJoueur.get("ouest")).toEqual({
      type: "ANNONCER",
      joueur: "ouest",
      couleur: "coeur",
    });
    expect(derniereActionParJoueur.has("nord")).toBe(false);
    expect(derniereActionParJoueur.has("est")).toBe(false);
  });

  it("conserve les reponses du premier tour pendant le premier tour d'encheres", () => {
    const historiqueEncheres: ActionEnchere[] = [
      { type: "PASSER", joueur: "sud" },
      { type: "PRENDRE", joueur: "ouest" },
    ];

    const derniereActionParJoueur = construireDerniereActionParJoueur(
      historiqueEncheres,
      "encheres1",
    );

    expect(derniereActionParJoueur.get("sud")).toEqual({
      type: "PASSER",
      joueur: "sud",
    });
    expect(derniereActionParJoueur.get("ouest")).toEqual({
      type: "PRENDRE",
      joueur: "ouest",
    });
  });
});
