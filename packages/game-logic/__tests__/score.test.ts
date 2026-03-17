import type { Carte, Couleur } from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import type { EntreeScoreManche } from "../src/score";
import {
  calculerScoreManche,
  getPointsAtout,
  getPointsCarte,
  getPointsHorsAtout,
  getPointsPli,
} from "../src/score";

// Helpers
function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
}

describe("getPointsAtout", () => {
  it("le valet d'atout vaut 20 points", () => {
    expect(getPointsAtout("valet")).toBe(20);
  });

  it("le 9 d'atout vaut 14 points", () => {
    expect(getPointsAtout("9")).toBe(14);
  });

  it("l'as d'atout vaut 11 points", () => {
    expect(getPointsAtout("as")).toBe(11);
  });

  it("le 10 d'atout vaut 10 points", () => {
    expect(getPointsAtout("10")).toBe(10);
  });

  it("le roi d'atout vaut 4 points", () => {
    expect(getPointsAtout("roi")).toBe(4);
  });

  it("la dame d'atout vaut 3 points", () => {
    expect(getPointsAtout("dame")).toBe(3);
  });

  it("le 7 et le 8 d'atout valent 0 points", () => {
    expect(getPointsAtout("7")).toBe(0);
    expect(getPointsAtout("8")).toBe(0);
  });

  it("le total des points à l'atout est 62", () => {
    const rangs: Carte["rang"][] = ["7", "8", "9", "10", "valet", "dame", "roi", "as"];
    const total = rangs.reduce((somme, rang) => somme + getPointsAtout(rang), 0);
    expect(total).toBe(62);
  });
});

describe("getPointsHorsAtout", () => {
  it("l'as hors atout vaut 11 points", () => {
    expect(getPointsHorsAtout("as")).toBe(11);
  });

  it("le 10 hors atout vaut 10 points", () => {
    expect(getPointsHorsAtout("10")).toBe(10);
  });

  it("le valet hors atout vaut 2 points", () => {
    expect(getPointsHorsAtout("valet")).toBe(2);
  });

  it("le 9 hors atout vaut 0 points", () => {
    expect(getPointsHorsAtout("9")).toBe(0);
  });

  it("le total des points hors atout est 30 par couleur", () => {
    const rangs: Carte["rang"][] = ["7", "8", "9", "10", "valet", "dame", "roi", "as"];
    const total = rangs.reduce((somme, rang) => somme + getPointsHorsAtout(rang), 0);
    expect(total).toBe(30);
  });
});

describe("getPointsCarte", () => {
  const atout: Couleur = "coeur";

  it("une carte d'atout utilise les points atout", () => {
    expect(getPointsCarte(carte("valet", "coeur"), atout)).toBe(20);
    expect(getPointsCarte(carte("9", "coeur"), atout)).toBe(14);
  });

  it("une carte hors atout utilise les points hors atout", () => {
    expect(getPointsCarte(carte("valet", "pique"), atout)).toBe(2);
    expect(getPointsCarte(carte("9", "pique"), atout)).toBe(0);
  });
});

describe("getPointsPli", () => {
  const atout: Couleur = "coeur";

  it("calcule la somme des points d'un pli", () => {
    const cartes: Carte[] = [
      carte("valet", "coeur"), // 20
      carte("as", "pique"), // 11
      carte("10", "carreau"), // 10
      carte("7", "trefle"), // 0
    ];
    expect(getPointsPli(cartes, atout)).toBe(41);
  });

  it("le total de toutes les cartes est 152", () => {
    // 62 (atout) + 30 * 3 (hors atout) = 152
    const toutesLesCartes: Carte[] = [];
    const couleurs: Couleur[] = ["pique", "coeur", "carreau", "trefle"];
    const rangs: Carte["rang"][] = ["7", "8", "9", "10", "valet", "dame", "roi", "as"];
    for (const couleur of couleurs) {
      for (const rang of rangs) {
        toutesLesCartes.push(carte(rang, couleur));
      }
    }
    expect(getPointsPli(toutesLesCartes, atout)).toBe(152);
  });
});

describe("calculerScoreManche", () => {
  describe("contrat rempli", () => {
    it("chaque équipe marque ses propres points quand le preneur atteint 82+", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 90,
        pointsEquipeDefenseur: 62,
        plisEquipePreneur: 5,
        plisEquipeDefenseur: 3,
        dernierPliPreneur: true,
        belotePreneur: false,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(100); // 90 + 10 dix de der
      expect(resultat.scoreDefenseur).toBe(62);
      expect(resultat.estChute).toBe(false);
      expect(resultat.estCapot).toBe(false);
    });

    it("le dix de der (10 points) va au gagnant du dernier pli", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 80,
        pointsEquipeDefenseur: 72,
        plisEquipePreneur: 4,
        plisEquipeDefenseur: 4,
        dernierPliPreneur: true,
        belotePreneur: false,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      // 80 + 10 = 90 >= 82, contrat rempli
      expect(resultat.scorePreneur).toBe(90);
      expect(resultat.scoreDefenseur).toBe(72);
    });

    it("le dix de der va au défenseur si c'est lui qui gagne le dernier pli", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 100,
        pointsEquipeDefenseur: 52,
        plisEquipePreneur: 5,
        plisEquipeDefenseur: 3,
        dernierPliPreneur: false,
        belotePreneur: false,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(100);
      expect(resultat.scoreDefenseur).toBe(62); // 52 + 10
    });
  });

  describe("chute", () => {
    it("le preneur qui fait moins de 82 chute → adversaire marque 162", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 70,
        pointsEquipeDefenseur: 82,
        plisEquipePreneur: 3,
        plisEquipeDefenseur: 5,
        dernierPliPreneur: false,
        belotePreneur: false,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(0);
      expect(resultat.scoreDefenseur).toBe(162);
      expect(resultat.estChute).toBe(true);
    });

    it("la belote est conservée même en cas de chute", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 60,
        pointsEquipeDefenseur: 92,
        plisEquipePreneur: 2,
        plisEquipeDefenseur: 6,
        dernierPliPreneur: false,
        belotePreneur: true,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(20); // 0 + 20 belote
      expect(resultat.scoreDefenseur).toBe(162);
      expect(resultat.estChute).toBe(true);
    });

    it("la belote du défenseur est ajoutée en cas de chute du preneur", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 60,
        pointsEquipeDefenseur: 92,
        plisEquipePreneur: 2,
        plisEquipeDefenseur: 6,
        dernierPliPreneur: false,
        belotePreneur: false,
        beloteDefenseur: true,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(0);
      expect(resultat.scoreDefenseur).toBe(182); // 162 + 20 belote
    });

    it("81 points pour le preneur = chute (il faut strictement 82)", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 81,
        pointsEquipeDefenseur: 71,
        plisEquipePreneur: 4,
        plisEquipeDefenseur: 4,
        dernierPliPreneur: false,
        belotePreneur: false,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      // 81 + 0 (dix de der au défenseur) = 81 < 82
      expect(resultat.estChute).toBe(true);
      expect(resultat.scorePreneur).toBe(0);
      expect(resultat.scoreDefenseur).toBe(162);
    });
  });

  describe("capot", () => {
    it("capot du preneur (8 plis) → 252 points", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 152,
        pointsEquipeDefenseur: 0,
        plisEquipePreneur: 8,
        plisEquipeDefenseur: 0,
        dernierPliPreneur: true,
        belotePreneur: false,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(252);
      expect(resultat.scoreDefenseur).toBe(0);
      expect(resultat.estCapot).toBe(true);
      expect(resultat.estChute).toBe(false);
    });

    it("capot du défenseur (8 plis) → défenseur marque 252", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 0,
        pointsEquipeDefenseur: 152,
        plisEquipePreneur: 0,
        plisEquipeDefenseur: 8,
        dernierPliPreneur: false,
        belotePreneur: false,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(0);
      expect(resultat.scoreDefenseur).toBe(252);
      expect(resultat.estCapot).toBe(true);
    });

    it("capot avec belote → 252 + 20", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 152,
        pointsEquipeDefenseur: 0,
        plisEquipePreneur: 8,
        plisEquipeDefenseur: 0,
        dernierPliPreneur: true,
        belotePreneur: true,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(272); // 252 + 20
      expect(resultat.scoreDefenseur).toBe(0);
    });
  });

  describe("belote / rebelote", () => {
    it("belote ajoute 20 points au score du preneur", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 90,
        pointsEquipeDefenseur: 62,
        plisEquipePreneur: 5,
        plisEquipeDefenseur: 3,
        dernierPliPreneur: true,
        belotePreneur: true,
        beloteDefenseur: false,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(120); // 90 + 10 + 20
    });

    it("belote ajoute 20 points au score du défenseur", () => {
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 100,
        pointsEquipeDefenseur: 52,
        plisEquipePreneur: 5,
        plisEquipeDefenseur: 3,
        dernierPliPreneur: true,
        belotePreneur: false,
        beloteDefenseur: true,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scoreDefenseur).toBe(72); // 52 + 20
    });

    it("les deux équipes peuvent avoir la belote", () => {
      // Cas impossible en vrai (un seul atout) mais le code le gère
      const entree: EntreeScoreManche = {
        pointsEquipePreneur: 90,
        pointsEquipeDefenseur: 62,
        plisEquipePreneur: 5,
        plisEquipeDefenseur: 3,
        dernierPliPreneur: true,
        belotePreneur: true,
        beloteDefenseur: true,
      };
      const resultat = calculerScoreManche(entree);
      expect(resultat.scorePreneur).toBe(120); // 90 + 10 + 20
      expect(resultat.scoreDefenseur).toBe(82); // 62 + 20
    });
  });
});
