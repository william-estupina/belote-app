import type { Carte, Couleur, VueBotJeu } from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import { deciderEncheres } from "../src/strategie-encheres";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
}

function creerVueEncheres(
  partiel: Partial<VueBotJeu> & { maMain: Carte[]; phaseJeu: "encheres1" | "encheres2" },
): VueBotJeu {
  return {
    maPosition: "nord",
    positionPartenaire: "sud",
    couleurAtout: null,
    pliEnCours: [],
    couleurDemandee: null,
    historiquePlis: [],
    scoreMonEquipe: 0,
    scoreAdversaire: 0,
    carteRetournee: carte("valet", "coeur"),
    historiqueEncheres: [],
    positionPreneur: "sud",
    positionDonneur: "est",
    ...partiel,
  };
}

// ──────────────────────────────────────────────
// Tour 1 — Prendre la retourne
// ──────────────────────────────────────────────

describe("deciderEncheres — Tour 1", () => {
  describe("Bot facile (ancien moyen + erreurs 12%)", () => {
    it("prend avec Valet + 9 d'atout", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"),
          carte("9", "coeur"),
          carte("7", "pique"),
          carte("8", "trefle"),
          carte("dame", "carreau"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("as", "coeur"),
      });

      // La majorité des appels doit retourner PRENDRE (sauf erreur 12%)
      let nbPrises = 0;
      for (let i = 0; i < 100; i++) {
        const action = deciderEncheres(vue, "facile");
        if (action.type === "PRENDRE") nbPrises++;
      }
      expect(nbPrises).toBeGreaterThan(75);
    });

    it("prend avec Valet d'atout + un As", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"),
          carte("as", "pique"),
          carte("7", "trefle"),
          carte("8", "carreau"),
          carte("dame", "carreau"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("roi", "coeur"),
      });

      // La majorité des appels doit retourner PRENDRE
      let nbPrises = 0;
      for (let i = 0; i < 100; i++) {
        const action = deciderEncheres(vue, "facile");
        if (action.type === "PRENDRE") nbPrises++;
      }
      expect(nbPrises).toBeGreaterThan(75);
    });

    it("passe avec une main faible", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("7", "pique"),
          carte("8", "trefle"),
          carte("dame", "carreau"),
          carte("7", "carreau"),
          carte("8", "pique"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("as", "coeur"),
      });

      // La majorité des appels doit retourner PASSER (sauf erreur 12%)
      let nbPasses = 0;
      for (let i = 0; i < 100; i++) {
        const action = deciderEncheres(vue, "facile");
        if (action.type === "PASSER") nbPasses++;
      }
      expect(nbPasses).toBeGreaterThan(75);
    });

    it("prend avec 4+ atouts même sans Valet/9", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("as", "coeur"),
          carte("roi", "coeur"),
          carte("dame", "coeur"),
          carte("8", "coeur"),
          carte("7", "pique"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("10", "coeur"),
      });

      // La majorité des appels doit retourner PRENDRE
      let nbPrises = 0;
      for (let i = 0; i < 100; i++) {
        const action = deciderEncheres(vue, "facile");
        if (action.type === "PRENDRE") nbPrises++;
      }
      expect(nbPrises).toBeGreaterThan(75);
    });

    it("inverse parfois la décision (composante aléatoire 12%)", () => {
      // Main forte (Valet+9) qui devrait toujours PRENDRE
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"),
          carte("9", "coeur"),
          carte("as", "pique"),
          carte("as", "trefle"),
          carte("as", "carreau"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("as", "coeur"),
      });

      let nbPrises = 0;
      for (let i = 0; i < 100; i++) {
        const action = deciderEncheres(vue, "facile");
        if (action.type === "PRENDRE") nbPrises++;
      }
      // Doit prendre souvent mais pas toujours (erreur ~12%)
      expect(nbPrises).toBeGreaterThan(75);
      expect(nbPrises).toBeLessThan(100);
    });
  });

  describe("Bot moyen (ancien difficile)", () => {
    it("prend avec Valet + 9 d'atout (toujours)", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"),
          carte("9", "coeur"),
          carte("7", "pique"),
          carte("8", "trefle"),
          carte("7", "carreau"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("as", "coeur"),
      });

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PRENDRE");
    });

    it("passe avec une main trop faible en points", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("7", "pique"),
          carte("8", "trefle"),
          carte("7", "carreau"),
          carte("8", "carreau"),
          carte("dame", "pique"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("7", "coeur"),
      });

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PASSER");
    });

    it("prend avec une main forte en points (≥ 87)", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"), // 20 pts atout
          carte("9", "coeur"), // 14 pts atout
          carte("as", "coeur"), // 11 pts atout
          carte("as", "pique"), // 11 pts hors atout
          carte("as", "trefle"), // 11 pts hors atout
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("10", "coeur"), // 10 pts atout
      });

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PRENDRE");
    });
  });

  describe("Bot difficile tour 1 (expert)", () => {
    it("prend avec valet + 9 + as hors atout (auto-prend)", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "pique"),
          carte("9", "pique"),
          carte("7", "pique"),
          carte("as", "carreau"),
          carte("roi", "coeur"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("dame", "pique"),
        positionDonneur: "est",
        positionPreneur: null,
      });
      const action = deciderEncheres(vue, "difficile");
      expect(action.type).toBe("PRENDRE");
    });

    it("refuse sans 2 couleurs couvertes hors atout (anti-chute)", () => {
      // Main sans valet+9, beaucoup d'atout mais rien hors atout
      const vue = creerVueEncheres({
        maMain: [
          carte("as", "pique"),
          carte("10", "pique"),
          carte("roi", "pique"),
          carte("dame", "pique"),
          carte("8", "pique"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("7", "pique"),
        positionDonneur: "est",
        positionPreneur: null,
      });
      const action = deciderEncheres(vue, "difficile");
      expect(action.type).toBe("PASSER");
    });

    it("passe avec main faible en points", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("7", "pique"),
          carte("8", "trefle"),
          carte("7", "carreau"),
          carte("8", "carreau"),
          carte("dame", "pique"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("7", "coeur"),
        positionDonneur: "est",
        positionPreneur: null,
      });
      const action = deciderEncheres(vue, "difficile");
      expect(action.type).toBe("PASSER");
    });

    it("prend avec main très forte en points", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"), // 20 atout
          carte("9", "coeur"), // 14 atout
          carte("as", "coeur"), // 11 atout
          carte("as", "pique"), // 11 hors atout
          carte("as", "trefle"), // 11 hors atout
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("10", "coeur"), // 10 atout
        positionDonneur: "est",
        positionPreneur: null,
      });
      const action = deciderEncheres(vue, "difficile");
      expect(action.type).toBe("PRENDRE");
    });

    it("compte belote/rebelote (+20 pts) dans l'évaluation", () => {
      // Roi+Dame d'atout + Valet = Belote possible
      const vue = creerVueEncheres({
        maMain: [
          carte("roi", "pique"),
          carte("dame", "pique"),
          carte("valet", "pique"), // 20 pts atout
          carte("as", "carreau"), // 11 pts hors atout
          carte("as", "coeur"), // 11 pts hors atout
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("9", "pique"), // 14 pts atout
        positionDonneur: "sud",
        maPosition: "sud",
        positionPreneur: null,
      });
      // Atout: roi(3)+dame(2)+valet(20)+retournée 9(14) = 39
      // Belote: +20 = 59
      // Hors: as(11)+as(11) = 22
      // Total: 81 → sous seuil 87 normal, mais position donneur (seuil 80) → PRENDRE
      const action = deciderEncheres(vue, "difficile");
      expect(action.type).toBe("PRENDRE");
    });
  });

  it("passe si pas de carte retournée", () => {
    const vue = creerVueEncheres({
      maMain: [carte("valet", "coeur"), carte("9", "coeur")],
      phaseJeu: "encheres1",
      carteRetournee: null,
    });

    for (const difficulte of ["facile", "moyen", "difficile"] as const) {
      const action = deciderEncheres(vue, difficulte);
      expect(action.type).toBe("PASSER");
    }
  });
});

// ──────────────────────────────────────────────
// Tour 2 — Proposer une autre couleur
// ──────────────────────────────────────────────

describe("deciderEncheres — Tour 2", () => {
  describe("Bot facile (ancien moyen + erreurs 12%)", () => {
    it("propose une couleur avec Valet + 9", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "pique"),
          carte("9", "pique"),
          carte("7", "trefle"),
          carte("8", "carreau"),
          carte("dame", "carreau"),
        ],
        phaseJeu: "encheres2",
        carteRetournee: carte("as", "coeur"), // coeur exclu au tour 2
      });

      // La majorité des appels doit retourner ANNONCER (sauf erreur 12%)
      let nbAnnonces = 0;
      for (let i = 0; i < 100; i++) {
        const action = deciderEncheres(vue, "facile");
        if (action.type === "ANNONCER") {
          nbAnnonces++;
          expect(action.couleur).toBe("pique");
        }
      }
      expect(nbAnnonces).toBeGreaterThan(75);
    });

    it("passe avec une main faible dans toutes les couleurs", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("7", "pique"),
          carte("8", "trefle"),
          carte("7", "carreau"),
          carte("8", "carreau"),
          carte("dame", "pique"),
        ],
        phaseJeu: "encheres2",
        carteRetournee: carte("as", "coeur"),
      });

      // La majorité des appels doit retourner PASSER
      let nbPasses = 0;
      for (let i = 0; i < 100; i++) {
        const action = deciderEncheres(vue, "facile");
        if (action.type === "PASSER") nbPasses++;
      }
      expect(nbPasses).toBeGreaterThan(75);
    });
  });

  describe("Bot moyen (ancien difficile)", () => {
    it("propose la meilleure couleur avec des points suffisants", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "trefle"),
          carte("9", "trefle"),
          carte("as", "trefle"),
          carte("as", "pique"),
          carte("10", "carreau"),
        ],
        phaseJeu: "encheres2",
        carteRetournee: carte("roi", "coeur"),
      });

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("ANNONCER");
      if (action.type === "ANNONCER") {
        expect(action.couleur).toBe("trefle");
      }
    });

    it("ne propose pas la couleur de la retourne", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"),
          carte("9", "coeur"),
          carte("as", "coeur"),
          carte("7", "pique"),
          carte("8", "trefle"),
        ],
        phaseJeu: "encheres2",
        carteRetournee: carte("roi", "coeur"), // coeur exclu
      });

      const action = deciderEncheres(vue, "moyen");
      // Même avec une super main coeur, on ne peut pas proposer coeur au tour 2
      if (action.type === "ANNONCER") {
        expect(action.couleur).not.toBe("coeur");
      }
    });
  });

  describe("Bot difficile tour 2 (expert)", () => {
    it("annonce avec main longue (4+ cartes) contenant valet", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "coeur"),
          carte("as", "coeur"),
          carte("10", "coeur"),
          carte("roi", "coeur"),
          carte("7", "carreau"),
        ],
        phaseJeu: "encheres2",
        carteRetournee: carte("roi", "pique"), // pique exclu
        positionDonneur: "est",
        positionPreneur: null,
      });
      const action = deciderEncheres(vue, "difficile");
      expect(action.type).toBe("ANNONCER");
      if (action.type === "ANNONCER") {
        expect(action.couleur).toBe("coeur");
      }
    });

    it("passe avec main faible", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("7", "coeur"),
          carte("8", "carreau"),
          carte("dame", "trefle"),
          carte("7", "trefle"),
          carte("8", "pique"),
        ],
        phaseJeu: "encheres2",
        carteRetournee: carte("roi", "pique"),
        positionDonneur: "est",
        positionPreneur: null,
      });
      const action = deciderEncheres(vue, "difficile");
      expect(action.type).toBe("PASSER");
    });

    it("ne propose pas la couleur de la retournée", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("valet", "pique"),
          carte("9", "pique"),
          carte("as", "pique"),
          carte("7", "carreau"),
          carte("8", "trefle"),
        ],
        phaseJeu: "encheres2",
        carteRetournee: carte("roi", "pique"), // pique exclu
        positionDonneur: "est",
        positionPreneur: null,
      });
      const action = deciderEncheres(vue, "difficile");
      if (action.type === "ANNONCER") {
        expect(action.couleur).not.toBe("pique");
      }
    });
  });

  it("passe si pas de carte retournée", () => {
    const vue = creerVueEncheres({
      maMain: [carte("valet", "pique"), carte("9", "pique")],
      phaseJeu: "encheres2",
      carteRetournee: null,
    });

    for (const difficulte of ["facile", "moyen", "difficile"] as const) {
      const action = deciderEncheres(vue, difficulte);
      expect(action.type).toBe("PASSER");
    }
  });
});
