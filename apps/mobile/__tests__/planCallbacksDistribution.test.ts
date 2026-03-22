import type { Carte } from "@belote/shared-types";

import { planifierCallbacksDistribution } from "../hooks/planCallbacksDistribution";

describe("planCallbacksDistribution", () => {
  it("calcule les delais de fin de paquet et le delai final de distribution", () => {
    const carte = { rang: "7", couleur: "coeur" } satisfies Carte;
    const plan = planifierCallbacksDistribution({
      paquets: [
        {
          indexDerniereCarteAtlas: 2,
          position: "sud",
          cartes: [carte, carte, carte],
          delaiDepartMs: 0,
        },
        {
          indexDerniereCarteAtlas: 7,
          position: "est",
          cartes: [carte, carte],
          delaiDepartMs: 1250,
        },
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

    expect(plan.evenementsDebutPaquets).toEqual([
      { delaiMs: 0, position: "sud", cartes: [carte, carte, carte] },
      { delaiMs: 1250, position: "est", cartes: [carte, carte] },
    ]);
    expect(plan.evenementsPaquets).toEqual([
      { delaiMs: 400, position: "sud", cartes: [carte, carte, carte] },
      { delaiMs: 1650, position: "est", cartes: [carte, carte] },
    ]);
    expect(plan.delaiFinDistributionMs).toBe(1650);
  });

  it("ignore les paquets sans delai resolvable", () => {
    const carte = { rang: "9", couleur: "pique" } satisfies Carte;
    const plan = planifierCallbacksDistribution({
      paquets: [
        {
          indexDerniereCarteAtlas: 99,
          position: "nord",
          cartes: [carte],
          delaiDepartMs: 0,
        },
      ],
      delaisCartes: [{ delai: 0, duree: 400 }],
    });

    expect(plan.evenementsDebutPaquets).toEqual([]);
    expect(plan.evenementsPaquets).toEqual([]);
    expect(plan.delaiFinDistributionMs).toBe(0);
  });
});
