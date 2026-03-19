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
// Bot difficile (expert)
// ──────────────────────────────────────────────

/** Helper pour creer une vue de jeu expert avec des defauts sensibles */
function creerVueJeuExpert(partiel: Partial<VueBotJeu> & { maMain: Carte[] }): VueBotJeu {
  return {
    maPosition: "sud",
    positionPartenaire: "nord",
    couleurAtout: "pique",
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

describe("deciderJeu — Bot difficile", () => {
  it("joue la seule carte disponible", () => {
    const vue = creerVueJeuExpert({
      maMain: [carte("dame", "trefle")],
    });

    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.rang).toBe("dame");
    }
  });

  it("entame avec une carte maitresse hors atout", () => {
    // L'As de pique a deja ete joue, le 10 est maitresse
    const vue = creerVueJeuExpert({
      maMain: [carte("10", "pique"), carte("7", "trefle"), carte("8", "carreau")],
      couleurAtout: "coeur",
      positionPreneur: "nord",
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
// Jeu difficile (expert) - entame
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - entame", () => {
  it("tire l'atout quand l'equipe est preneuse et a la majorite", () => {
    const vue = creerVueJeuExpert({
      maMain: [
        carte("valet", "pique"),
        carte("9", "pique"),
        carte("as", "pique"),
        carte("roi", "carreau"),
        carte("as", "coeur"),
      ],
      positionPreneur: "sud",
      maPosition: "sud",
      couleurAtout: "pique",
      pliEnCours: [],
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte.couleur).toBe("pique");
    }
  });

  it("joue carte maitresse hors atout en entame", () => {
    const vue = creerVueJeuExpert({
      maMain: [carte("as", "carreau"), carte("7", "coeur"), carte("8", "pique")],
      positionPreneur: "ouest",
      couleurAtout: "pique",
      pliEnCours: [],
    });
    const action = deciderJeu(vue, "difficile");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte).toEqual(carte("as", "carreau"));
    }
  });
});

// ──────────────────────────────────────────────
// Jeu difficile (expert) - partenaire gagne
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - partenaire gagne", () => {
  it("charge en points si partenaire a la maitresse", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "nord" as PositionJoueur, carte: carte("as", "carreau") }],
      maMain: [carte("10", "carreau"), carte("7", "carreau")],
      couleurDemandee: "carreau",
      maPosition: "sud",
      positionPartenaire: "nord",
    });
    const action = deciderJeu(vue, "difficile");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte).toEqual(carte("10", "carreau"));
    }
  });

  it("joue la plus faible si partenaire n'a pas la maitresse", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "nord" as PositionJoueur, carte: carte("roi", "carreau") }],
      maMain: [carte("10", "carreau"), carte("7", "carreau")],
      couleurDemandee: "carreau",
    });
    const action = deciderJeu(vue, "difficile");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte).toEqual(carte("7", "carreau"));
    }
  });
});

// ──────────────────────────────────────────────
// Jeu difficile (expert) - adversaire gagne
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - adversaire gagne", () => {
  it("coupe avec le plus petit atout suffisant, pas le valet", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest" as PositionJoueur, carte: carte("as", "carreau") }],
      maMain: [carte("valet", "pique"), carte("7", "pique"), carte("8", "coeur")],
      couleurDemandee: "carreau",
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte).toEqual(carte("7", "pique"));
    }
  });

  it("sur-coupe si le pli vaut le coup (beaucoup de points)", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("as", "carreau") }, // 11 pts
        { joueur: "ouest" as PositionJoueur, carte: carte("7", "pique") }, // coupe adverse
        { joueur: "nord" as PositionJoueur, carte: carte("10", "carreau") }, // 10 pts
      ],
      maMain: [
        carte("8", "pique"), // peut sur-couper
        carte("7", "coeur"),
      ],
      couleurDemandee: "carreau",
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte).toEqual(carte("8", "pique"));
    }
  });

  it("ne sur-coupe pas si le pli ne vaut pas le coup (partenaire maitre)", () => {
    // Nord (partenaire) a coupe avec le valet d'atout, il est maitre.
    // Ouest a joue avant. Le pli ne vaut presque rien.
    // Le bot peut jouer ce qu'il veut (partenaire maitre = toute la main jouable).
    // Il ne devrait PAS gaspiller un atout fort.
    const vue = creerVueJeuExpert({
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("7", "carreau") }, // 0 pts
        { joueur: "nord" as PositionJoueur, carte: carte("valet", "pique") }, // partenaire coupe → maitre
        { joueur: "ouest" as PositionJoueur, carte: carte("8", "carreau") }, // 0 pts
      ],
      maMain: [
        carte("9", "pique"), // atout fort, ne pas gaspiller
        carte("7", "coeur"),
      ],
      couleurDemandee: "carreau",
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    if (action.type === "JOUER_CARTE") {
      // Ne devrait PAS gaspiller le 9 d'atout (14 pts) sur un pli sans valeur
      // Devrait jouer le 7 de coeur (0 pts)
      expect(action.carte).toEqual(carte("7", "coeur"));
    }
  });
});

// ──────────────────────────────────────────────
// Jeu difficile (expert) - belote/rebelote
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - belote/rebelote", () => {
  it("garde roi et dame d'atout ensemble quand possible", () => {
    const vue = creerVueJeuExpert({
      maMain: [
        carte("roi", "pique"),
        carte("dame", "pique"),
        carte("7", "pique"),
        carte("as", "carreau"),
      ],
      couleurAtout: "pique",
      pliEnCours: [],
      positionPreneur: "sud",
      maPosition: "sud",
    });
    const action = deciderJeu(vue, "difficile");
    if (action.type === "JOUER_CARTE" && action.carte.couleur === "pique") {
      // Si tire l'atout, devrait jouer le 7, pas roi ou dame
      expect(action.carte.rang).not.toBe("roi");
      expect(action.carte.rang).not.toBe("dame");
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
