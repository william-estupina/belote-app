import type { Carte, Couleur, PositionJoueur, VueBotJeu } from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import { deciderJeu } from "../src/strategie-jeu";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
}

function creerVueJeu(partiel: Partial<VueBotJeu> & { maMain: Carte[] }): VueBotJeu {
  return {
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

function cartesEgales(a: Carte, b: Carte): boolean {
  return a.couleur === b.couleur && a.rang === b.rang;
}

// ──────────────────────────────────────────────
// Bot facile
// ──────────────────────────────────────────────

describe("deciderJeu — Bot facile", () => {
  it("joue toujours une carte de la main", () => {
    const main = [carte("as", "pique"), carte("roi", "pique"), carte("dame", "trefle")];
    const vue = creerVueJeu({ maMain: main });

    for (let i = 0; i < 20; i++) {
      const action = deciderJeu(vue, "facile");
      expect(action.type).toBe("JOUER_CARTE");
      if (action.type === "JOUER_CARTE") {
        expect(main.some((c) => cartesEgales(c, action.carte))).toBe(true);
      }
    }
  });

  it("joue la seule carte disponible", () => {
    const vue = creerVueJeu({
      maMain: [carte("7", "pique")],
    });

    const action = deciderJeu(vue, "facile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("7");
      expect(action.carte.couleur).toBe("pique");
    }
  });
});

// ──────────────────────────────────────────────
// Bot moyen
// ──────────────────────────────────────────────

describe("deciderJeu — Bot moyen", () => {
  it("entame avec un As hors atout si disponible", () => {
    const vue = creerVueJeu({
      maMain: [
        carte("as", "pique"),
        carte("7", "trefle"),
        carte("8", "carreau"),
        carte("9", "coeur"),
      ],
      pliEnCours: [], // entame
    });

    const action = deciderJeu(vue, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("as");
      expect(action.carte.couleur).toBe("pique");
    }
  });

  it("joue le plus faible quand le partenaire est maître", () => {
    const vue = creerVueJeu({
      maMain: [carte("as", "pique"), carte("7", "pique"), carte("10", "pique")],
      couleurAtout: "coeur",
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
        { joueur: "sud" as PositionJoueur, carte: carte("as", "carreau") }, // partenaire (sud) ne fournit pas → mais maître?
      ],
    });

    // Sud (partenaire) a joué un carreau sur du pique — ça ne le rend pas maître.
    // Changeons pour que le partenaire soit bien maître :
    const vue2 = creerVueJeu({
      maMain: [carte("10", "pique"), carte("7", "pique")],
      couleurAtout: "coeur",
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
        { joueur: "sud" as PositionJoueur, carte: carte("valet", "coeur") }, // partenaire coupe avec atout → maître
      ],
    });

    const action = deciderJeu(vue2, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Doit jouer le plus faible (7 de pique)
      expect(action.carte.rang).toBe("7");
    }
  });

  it("joue la plus forte quand l'adversaire est maître", () => {
    const vue = creerVueJeu({
      maMain: [carte("as", "pique"), carte("7", "pique")],
      couleurAtout: "coeur",
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
        // est est adversaire et actuellement maître (seule carte)
      ],
    });

    const action = deciderJeu(vue, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("as");
    }
  });

  it("entame avec le plus faible atout si que des atouts", () => {
    const vue = creerVueJeu({
      maMain: [carte("valet", "coeur"), carte("9", "coeur"), carte("7", "coeur")],
      couleurAtout: "coeur",
      pliEnCours: [],
    });

    const action = deciderJeu(vue, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("7");
      expect(action.carte.couleur).toBe("coeur");
    }
  });
});

// ──────────────────────────────────────────────
// Bot difficile
// ──────────────────────────────────────────────

describe("deciderJeu — Bot difficile", () => {
  it("entame avec une carte maîtresse hors atout", () => {
    // Tous les As de pique plus forts sont joués, le 10 est maîtresse
    const vue = creerVueJeu({
      maMain: [carte("10", "pique"), carte("7", "trefle"), carte("8", "carreau")],
      couleurAtout: "coeur",
      pliEnCours: [],
      historiquePlis: [
        {
          cartes: [
            { joueur: "sud" as PositionJoueur, carte: carte("as", "pique") },
            { joueur: "ouest" as PositionJoueur, carte: carte("9", "pique") },
            { joueur: "nord" as PositionJoueur, carte: carte("8", "pique") },
            { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
          ],
          gagnant: "sud" as PositionJoueur,
          points: 15,
        },
      ],
    });

    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Le 10 de pique est maîtresse (l'As est déjà joué)
      expect(action.carte.rang).toBe("10");
      expect(action.carte.couleur).toBe("pique");
    }
  });

  it("donne des points au partenaire quand il est maître", () => {
    const vue = creerVueJeu({
      maMain: [
        carte("as", "pique"), // 11 points
        carte("7", "trefle"), // 0 points
      ],
      couleurAtout: "coeur",
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
        { joueur: "sud" as PositionJoueur, carte: carte("valet", "coeur") }, // partenaire coupe → maître
      ],
    });

    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Doit donner l'As (plus de points) au partenaire
      expect(action.carte.rang).toBe("as");
      expect(action.carte.couleur).toBe("pique");
    }
  });

  it("défausse la carte avec le moins de points quand impossible de gagner", () => {
    const vue = creerVueJeu({
      maMain: [
        carte("as", "carreau"), // 11 pts
        carte("7", "trefle"), // 0 pts
      ],
      couleurAtout: "coeur",
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("as", "pique") },
        { joueur: "sud" as PositionJoueur, carte: carte("roi", "pique") },
        { joueur: "ouest" as PositionJoueur, carte: carte("10", "pique") },
      ],
    });

    // On n'a ni pique ni atout → défausser
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Devrait défausser le 7 de trèfle (0 pts) plutôt que l'As de carreau (11 pts)
      expect(action.carte.rang).toBe("7");
      expect(action.carte.couleur).toBe("trefle");
    }
  });

  it("joue la seule carte disponible sans hésiter", () => {
    const vue = creerVueJeu({
      maMain: [carte("dame", "trefle")],
    });

    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("dame");
    }
  });

  it("fait tomber les atouts adverses avec Valet d'atout en entame", () => {
    const vue = creerVueJeu({
      maMain: [carte("valet", "coeur"), carte("9", "coeur"), carte("7", "trefle")],
      couleurAtout: "coeur",
      pliEnCours: [],
      historiquePlis: [],
    });

    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Doit jouer l'atout fort (valet) pour faire tomber les atouts adverses
      expect(action.carte.couleur).toBe("coeur");
      expect(["valet", "9"]).toContain(action.carte.rang);
    }
  });
});

// ──────────────────────────────────────────────
// Tous les niveaux retournent une action valide
// ──────────────────────────────────────────────

describe("deciderJeu — Validité globale", () => {
  const niveaux = ["facile", "moyen", "difficile"] as const;

  for (const niveau of niveaux) {
    it(`${niveau} : retourne toujours JOUER_CARTE`, () => {
      const vue = creerVueJeu({
        maMain: [
          carte("as", "pique"),
          carte("roi", "coeur"),
          carte("7", "trefle"),
          carte("dame", "carreau"),
        ],
      });

      const action = deciderJeu(vue, niveau);
      expect(action.type).toBe("JOUER_CARTE");
    });
  }

  for (const niveau of niveaux) {
    it(`${niveau} : la carte jouée vient bien de la main`, () => {
      const main = [carte("as", "pique"), carte("roi", "coeur"), carte("7", "trefle")];
      const vue = creerVueJeu({ maMain: main });

      for (let i = 0; i < 10; i++) {
        const action = deciderJeu(vue, niveau);
        if (action.type === "JOUER_CARTE") {
          expect(main.some((c) => cartesEgales(c, action.carte))).toBe(true);
        }
      }
    });
  }
});
