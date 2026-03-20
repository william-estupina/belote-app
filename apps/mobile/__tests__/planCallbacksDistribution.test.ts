import type { Carte } from "@belote/shared-types";

import { planifierCallbacksDistribution } from "../hooks/planCallbacksDistribution";

describe("planCallbacksDistribution", () => {
  it("calcule les delais de fin de paquet et le delai final de distribution", () => {
    const carte = { rang: "7", couleur: "coeur" } satisfies Carte;
    const plan = planifierCallbacksDistribution({
      paquets: [
        { indexDerniereCarteAtlas: 2, position: "sud", cartes: [carte, carte, carte] },
        { indexDerniereCarteAtlas: 7, position: "est", cartes: [carte, carte] },
      ],
      delaisCartes: [
        { delai: 0, duree: 400 },
        { delai: 0, duree: 400 },
        { delai: 0, duree: 400 },
        { delai: 250, duree: 400 },
        { delai: 500, duree: 400 },
        { delai: 750, duree: 400 },
        { delai: 1000, duree: 400 },
        { delai: 1250, duree: 400 },
      ],
    });

    expect(plan.evenementsPaquets).toEqual([
      { delaiMs: 400, position: "sud", cartes: [carte, carte, carte] },
      { delaiMs: 1650, position: "est", cartes: [carte, carte] },
    ]);
    expect(plan.delaiFinDistributionMs).toBe(1650);
  });

  it("ignore les paquets sans delai resolvable", () => {
    const carte = { rang: "9", couleur: "pique" } satisfies Carte;
    const plan = planifierCallbacksDistribution({
      paquets: [{ indexDerniereCarteAtlas: 99, position: "nord", cartes: [carte] }],
      delaisCartes: [{ delai: 0, duree: 400 }],
    });

    expect(plan.evenementsPaquets).toEqual([]);
    expect(plan.delaiFinDistributionMs).toBe(0);
  });
});
