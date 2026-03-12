import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import { evaluerPli, getForceAtout, getForceHorsAtout } from "../src/pli";

// Helpers
function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
}

type EntreePli = { joueur: PositionJoueur; carte: Carte };

describe("getForceAtout", () => {
  it("doit ordonner les cartes à l'atout : Valet > 9 > As > 10 > Roi > Dame > 8 > 7", () => {
    const forces = [
      getForceAtout("valet"),
      getForceAtout("9"),
      getForceAtout("as"),
      getForceAtout("10"),
      getForceAtout("roi"),
      getForceAtout("dame"),
      getForceAtout("8"),
      getForceAtout("7"),
    ];
    // Chaque valeur doit être strictement supérieure à la suivante
    for (let i = 0; i < forces.length - 1; i++) {
      expect(forces[i]).toBeGreaterThan(forces[i + 1]);
    }
  });

  it("le valet d'atout est la carte la plus forte", () => {
    expect(getForceAtout("valet")).toBe(7);
  });

  it("le 9 d'atout est la deuxième plus forte", () => {
    expect(getForceAtout("9")).toBe(6);
  });
});

describe("getForceHorsAtout", () => {
  it("doit ordonner les cartes hors atout : As > 10 > Roi > Dame > Valet > 9 > 8 > 7", () => {
    const forces = [
      getForceHorsAtout("as"),
      getForceHorsAtout("10"),
      getForceHorsAtout("roi"),
      getForceHorsAtout("dame"),
      getForceHorsAtout("valet"),
      getForceHorsAtout("9"),
      getForceHorsAtout("8"),
      getForceHorsAtout("7"),
    ];
    for (let i = 0; i < forces.length - 1; i++) {
      expect(forces[i]).toBeGreaterThan(forces[i + 1]);
    }
  });

  it("l'as est la carte la plus forte hors atout", () => {
    expect(getForceHorsAtout("as")).toBe(7);
  });
});

describe("evaluerPli", () => {
  const atout: Couleur = "coeur";

  it("la carte la plus forte de la couleur demandée gagne (pas d'atout)", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("roi", "pique") },
      { joueur: "ouest", carte: carte("dame", "pique") },
      { joueur: "nord", carte: carte("as", "pique") },
      { joueur: "est", carte: carte("10", "pique") },
    ];
    expect(evaluerPli(pli, atout)).toBe("nord");
  });

  it("un atout bat toutes les cartes hors atout", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("as", "pique") },
      { joueur: "ouest", carte: carte("7", "coeur") }, // atout faible
      { joueur: "nord", carte: carte("10", "pique") },
      { joueur: "est", carte: carte("roi", "pique") },
    ];
    expect(evaluerPli(pli, atout)).toBe("ouest");
  });

  it("entre deux atouts, le plus fort gagne", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("as", "pique") },
      { joueur: "ouest", carte: carte("9", "coeur") }, // atout fort (14 pts)
      { joueur: "nord", carte: carte("valet", "coeur") }, // atout le plus fort
      { joueur: "est", carte: carte("roi", "pique") },
    ];
    expect(evaluerPli(pli, atout)).toBe("nord");
  });

  it("une carte d'une autre couleur (ni atout ni demandée) ne gagne pas", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("7", "pique") },
      { joueur: "ouest", carte: carte("as", "carreau") }, // autre couleur
      { joueur: "nord", carte: carte("8", "pique") },
      { joueur: "est", carte: carte("as", "trefle") }, // autre couleur
    ];
    expect(evaluerPli(pli, atout)).toBe("nord");
  });

  it("si la couleur demandée est l'atout, le plus fort atout gagne", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("7", "coeur") },
      { joueur: "ouest", carte: carte("valet", "coeur") },
      { joueur: "nord", carte: carte("9", "coeur") },
      { joueur: "est", carte: carte("as", "coeur") },
    ];
    expect(evaluerPli(pli, atout)).toBe("ouest"); // valet d'atout
  });

  it("le premier joueur gagne si personne ne bat sa carte", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("as", "carreau") },
      { joueur: "ouest", carte: carte("7", "pique") },
      { joueur: "nord", carte: carte("8", "trefle") },
      { joueur: "est", carte: carte("9", "pique") },
    ];
    expect(evaluerPli(pli, atout)).toBe("sud");
  });

  it("entre deux cartes de même couleur demandée, l'ordre hors atout s'applique", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("dame", "trefle") },
      { joueur: "ouest", carte: carte("valet", "trefle") },
      { joueur: "nord", carte: carte("roi", "trefle") },
      { joueur: "est", carte: carte("7", "pique") },
    ];
    // Hors atout : Roi > Dame > Valet
    expect(evaluerPli(pli, atout)).toBe("nord");
  });

  it("le 10 bat le roi hors atout", () => {
    const pli: EntreePli[] = [
      { joueur: "sud", carte: carte("roi", "carreau") },
      { joueur: "ouest", carte: carte("10", "carreau") },
      { joueur: "nord", carte: carte("8", "carreau") },
      { joueur: "est", carte: carte("7", "carreau") },
    ];
    expect(evaluerPli(pli, atout)).toBe("ouest");
  });
});
