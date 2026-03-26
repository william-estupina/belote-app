import type { ActionEnchere } from "@belote/shared-types";

import { construireDerniereActionParJoueur } from "../hooks/derniere-action-enchere";

describe("construireDerniereActionParJoueur", () => {
  it("efface la bulle du joueur actif au tour 2 mais garde celles des joueurs pas encore reparles", () => {
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
      "nord",
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
    // Nord est le joueur actif → sa bulle du tour 1 disparaît
    expect(derniereActionParJoueur.has("nord")).toBe(false);
    // Est n'a pas encore reparlé → sa bulle du tour 1 reste visible
    expect(derniereActionParJoueur.get("est")).toEqual({
      type: "PASSER",
      joueur: "est",
    });
  });

  it("efface toutes les bulles du tour 1 quand le premier joueur reparle au tour 2", () => {
    const historiqueEncheres: ActionEnchere[] = [
      { type: "PASSER", joueur: "sud" },
      { type: "PASSER", joueur: "ouest" },
      { type: "PASSER", joueur: "nord" },
      { type: "PASSER", joueur: "est" },
    ];

    // Sud est le premier à reparler — les trois autres gardent leurs bulles
    const derniereActionParJoueur = construireDerniereActionParJoueur(
      historiqueEncheres,
      "encheres2",
      "sud",
    );

    expect(derniereActionParJoueur.has("sud")).toBe(false);
    expect(derniereActionParJoueur.get("ouest")).toEqual({
      type: "PASSER",
      joueur: "ouest",
    });
    expect(derniereActionParJoueur.get("nord")).toEqual({
      type: "PASSER",
      joueur: "nord",
    });
    expect(derniereActionParJoueur.get("est")).toEqual({
      type: "PASSER",
      joueur: "est",
    });
  });

  it("conserve les reponses du premier tour pendant le premier tour d'encheres", () => {
    const historiqueEncheres: ActionEnchere[] = [
      { type: "PASSER", joueur: "sud" },
      { type: "PRENDRE", joueur: "ouest" },
    ];

    const derniereActionParJoueur = construireDerniereActionParJoueur(
      historiqueEncheres,
      "encheres1",
      "nord",
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
