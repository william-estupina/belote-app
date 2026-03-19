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
    positionPreneur: "sud",
    positionDonneur: "est",
    ...partiel,
  };
}

function cartesEgales(a: Carte, b: Carte): boolean {
  return a.couleur === b.couleur && a.rang === b.rang;
}

// ──────────────────────────────────────────────
// Bot facile (ancien moyen : heuristiques de base)
// ──────────────────────────────────────────────

describe("deciderJeu — Bot facile", () => {
  it("entame avec un as hors atout si disponible", () => {
    const vue = creerVueJeu({
      maMain: [
        carte("as", "pique"),
        carte("7", "trefle"),
        carte("8", "carreau"),
        carte("9", "coeur"),
      ],
      pliEnCours: [], // entame
    });

    const action = deciderJeu(vue, "facile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("as");
      expect(action.carte.couleur).toBe("pique");
    }
  });

  it("joue le plus faible quand le partenaire est maitre", () => {
    const vue = creerVueJeu({
      maMain: [carte("10", "pique"), carte("7", "pique")],
      couleurAtout: "coeur",
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
        { joueur: "sud" as PositionJoueur, carte: carte("valet", "coeur") }, // partenaire coupe avec atout
      ],
    });

    const action = deciderJeu(vue, "facile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("7");
    }
  });

  it("joue la plus forte quand l'adversaire est maitre", () => {
    const vue = creerVueJeu({
      maMain: [carte("as", "pique"), carte("7", "pique")],
      couleurAtout: "coeur",
      pliEnCours: [{ joueur: "est" as PositionJoueur, carte: carte("roi", "pique") }],
    });

    const action = deciderJeu(vue, "facile");
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

    const action = deciderJeu(vue, "facile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("7");
      expect(action.carte.couleur).toBe("coeur");
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
// Bot moyen (ancien difficile : comptage de cartes)
// ──────────────────────────────────────────────

describe("deciderJeu — Bot moyen", () => {
  it("entame avec une carte maitresse hors atout", () => {
    // L'As de pique a deja ete joue, le 10 est maitresse
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

    const action = deciderJeu(vue, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Le 10 de pique est maitresse (l'As est deja joue)
      expect(action.carte.rang).toBe("10");
      expect(action.carte.couleur).toBe("pique");
    }
  });

  it("donne des points au partenaire quand il est maitre", () => {
    const vue = creerVueJeu({
      maMain: [
        carte("as", "pique"), // 11 points
        carte("7", "trefle"), // 0 points
      ],
      couleurAtout: "coeur",
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
        { joueur: "sud" as PositionJoueur, carte: carte("valet", "coeur") }, // partenaire coupe
      ],
    });

    const action = deciderJeu(vue, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Doit donner l'As (plus de points) au partenaire
      expect(action.carte.rang).toBe("as");
      expect(action.carte.couleur).toBe("pique");
    }
  });

  it("defausse la carte avec le moins de points quand impossible de gagner", () => {
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

    // On n'a ni pique ni atout -> defausser
    const action = deciderJeu(vue, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Devrait defausser le 7 de trefle (0 pts) plutot que l'As de carreau (11 pts)
      expect(action.carte.rang).toBe("7");
      expect(action.carte.couleur).toBe("trefle");
    }
  });

  it("fait tomber les atouts adverses avec valet d'atout en entame", () => {
    const vue = creerVueJeu({
      maMain: [carte("valet", "coeur"), carte("9", "coeur"), carte("7", "trefle")],
      couleurAtout: "coeur",
      pliEnCours: [],
      historiquePlis: [],
    });

    const action = deciderJeu(vue, "moyen");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Doit jouer l'atout fort (valet) pour faire tomber les atouts adverses
      expect(action.carte.couleur).toBe("coeur");
      expect(["valet", "9"]).toContain(action.carte.rang);
    }
  });
});

// ──────────────────────────────────────────────
// Bot difficile (stub qui delegue au moyen)
// ──────────────────────────────────────────────

describe("deciderJeu — Bot difficile", () => {
  it("joue la seule carte disponible", () => {
    const vue = creerVueJeu({
      maMain: [carte("dame", "trefle")],
    });

    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("dame");
    }
  });

  it("entame avec une carte maitresse (delegue au moyen)", () => {
    // Meme test que moyen : le 10 de pique est maitresse apres que l'As a ete joue
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
      expect(action.carte.rang).toBe("10");
      expect(action.carte.couleur).toBe("pique");
    }
  });
});

// ──────────────────────────────────────────────
// Tous les niveaux retournent une action valide
// ──────────────────────────────────────────────

describe("deciderJeu — Validite globale", () => {
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
    it(`${niveau} : la carte jouee vient bien de la main`, () => {
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
