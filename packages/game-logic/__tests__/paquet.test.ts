import { describe, expect, it } from "vitest";

import {
  creerPaquet,
  distribuerInitial,
  distribuerRestantes,
  melanger,
} from "../src/paquet";

describe("creerPaquet", () => {
  it("doit créer un paquet de 32 cartes", () => {
    const paquet = creerPaquet();
    expect(paquet).toHaveLength(32);
  });

  it("doit avoir 4 couleurs avec 8 cartes chacune", () => {
    const paquet = creerPaquet();
    const couleurs = new Set(paquet.map((c) => c.couleur));
    expect(couleurs.size).toBe(4);
    for (const couleur of couleurs) {
      expect(paquet.filter((c) => c.couleur === couleur)).toHaveLength(8);
    }
  });
});

describe("melanger", () => {
  it("doit retourner 32 cartes", () => {
    const paquet = creerPaquet();
    const melange = melanger(paquet);
    expect(melange).toHaveLength(32);
  });

  it("doit contenir les mêmes cartes", () => {
    const paquet = creerPaquet();
    const melange = melanger(paquet);
    const paquetTrie = [...paquet].sort((a, b) =>
      `${a.couleur}${a.rang}`.localeCompare(`${b.couleur}${b.rang}`),
    );
    const melangeTrie = [...melange].sort((a, b) =>
      `${a.couleur}${a.rang}`.localeCompare(`${b.couleur}${b.rang}`),
    );
    expect(melangeTrie).toEqual(paquetTrie);
  });
});

describe("distribuerInitial", () => {
  it("doit distribuer 5 cartes à chaque joueur", () => {
    const paquet = creerPaquet();
    const { mains } = distribuerInitial(paquet);
    for (const main of mains) {
      expect(main).toHaveLength(5);
    }
  });

  it("doit avoir 12 cartes restantes", () => {
    const paquet = creerPaquet();
    const { restantes } = distribuerInitial(paquet);
    expect(restantes).toHaveLength(12);
  });

  it("doit avoir une carte retournée", () => {
    const paquet = creerPaquet();
    const { carteRetournee } = distribuerInitial(paquet);
    expect(carteRetournee).toBeDefined();
    expect(carteRetournee.couleur).toBeDefined();
    expect(carteRetournee.rang).toBeDefined();
  });
});

describe("distribuerRestantes", () => {
  it("doit donner 8 cartes à chaque joueur", () => {
    const paquet = creerPaquet();
    const { mains, restantes } = distribuerInitial(paquet);
    const mainsFinales = distribuerRestantes(mains, restantes, 0);
    for (const main of mainsFinales) {
      expect(main).toHaveLength(8);
    }
  });

  it("doit utiliser les 32 cartes", () => {
    const paquet = creerPaquet();
    const { mains, restantes } = distribuerInitial(paquet);
    const mainsFinales = distribuerRestantes(mains, restantes, 0);
    const toutesLesCartes = mainsFinales.flat();
    expect(toutesLesCartes).toHaveLength(32);
  });
});
