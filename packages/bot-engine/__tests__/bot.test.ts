import type { Carte, Couleur, VueBotJeu } from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import { deciderBot } from "../src/bot";

function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
}

function creerVue(partiel: Partial<VueBotJeu>): VueBotJeu {
  return {
    maMain: [carte("as", "pique"), carte("roi", "coeur"), carte("7", "trefle")],
    maPosition: "nord",
    positionPartenaire: "sud",
    couleurAtout: "coeur",
    pliEnCours: [],
    couleurDemandee: null,
    historiquePlis: [],
    scoreMonEquipe: 0,
    scoreAdversaire: 0,
    phaseJeu: "jeu",
    carteRetournee: null,
    historiqueEncheres: [],
    ...partiel,
  };
}

describe("deciderBot", () => {
  const niveaux = ["facile", "moyen", "difficile"] as const;

  for (const niveau of niveaux) {
    it(`${niveau} : dispatche vers les enchères en phase encheres1`, () => {
      const vue = creerVue({
        phaseJeu: "encheres1",
        carteRetournee: carte("roi", "coeur"),
        couleurAtout: null,
      });

      const action = deciderBot(vue, niveau);
      expect(["PRENDRE", "PASSER"]).toContain(action.type);
    });

    it(`${niveau} : dispatche vers les enchères en phase encheres2`, () => {
      const vue = creerVue({
        phaseJeu: "encheres2",
        carteRetournee: carte("roi", "coeur"),
        couleurAtout: null,
      });

      const action = deciderBot(vue, niveau);
      expect(["ANNONCER", "PASSER"]).toContain(action.type);
    });

    it(`${niveau} : dispatche vers le jeu en phase jeu`, () => {
      const vue = creerVue({ phaseJeu: "jeu" });

      const action = deciderBot(vue, niveau);
      expect(action.type).toBe("JOUER_CARTE");
    });
  }
});
