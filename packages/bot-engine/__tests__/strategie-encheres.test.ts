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
  describe("Bot facile", () => {
    it("passe si moins de 2 atouts", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("as", "pique"),
          carte("roi", "pique"),
          carte("dame", "trefle"),
          carte("10", "carreau"),
          carte("7", "coeur"), // 1 seul atout (coeur)
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("valet", "coeur"),
      });

      // Avec 1 seul atout, le bot facile passe toujours
      const resultats = new Set<string>();
      for (let i = 0; i < 50; i++) {
        resultats.add(deciderEncheres(vue, "facile").type);
      }
      expect(resultats.has("PRENDRE")).toBe(false);
    });

    it("prend parfois avec 3+ atouts", () => {
      const vue = creerVueEncheres({
        maMain: [
          carte("as", "coeur"),
          carte("roi", "coeur"),
          carte("dame", "coeur"),
          carte("10", "pique"),
          carte("7", "trefle"),
        ],
        phaseJeu: "encheres1",
        carteRetournee: carte("valet", "coeur"),
      });

      // Avec 3 atouts, le bot facile prend toujours
      const action = deciderEncheres(vue, "facile");
      expect(action.type).toBe("PRENDRE");
    });
  });

  describe("Bot moyen", () => {
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

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PRENDRE");
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

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PRENDRE");
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

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PASSER");
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

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PRENDRE");
    });
  });

  describe("Bot difficile", () => {
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

      const action = deciderEncheres(vue, "difficile");
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

      const action = deciderEncheres(vue, "difficile");
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
  describe("Bot moyen", () => {
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

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("ANNONCER");
      if (action.type === "ANNONCER") {
        expect(action.couleur).toBe("pique");
      }
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

      const action = deciderEncheres(vue, "moyen");
      expect(action.type).toBe("PASSER");
    });
  });

  describe("Bot difficile", () => {
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

      const action = deciderEncheres(vue, "difficile");
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

      const action = deciderEncheres(vue, "difficile");
      // Même avec une super main coeur, on ne peut pas proposer coeur au tour 2
      if (action.type === "ANNONCER") {
        expect(action.couleur).not.toBe("coeur");
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
