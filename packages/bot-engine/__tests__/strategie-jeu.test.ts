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
// Jeu difficile (expert) - ne pas gaspiller de cartes
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - économie de cartes", () => {
  it("ne joue pas le 10 quand l'As adverse est encore en jeu", () => {
    // Ouest entame avec le Roi de carreau, le bot (sud) a le 10 et le 7.
    // L'As de carreau n'a pas été joué → il reste un adversaire après le bot.
    // Le bot ne doit pas gaspiller le 10 qui se ferait prendre par l'As.
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest" as PositionJoueur, carte: carte("roi", "carreau") }],
      maMain: [carte("10", "carreau"), carte("7", "carreau"), carte("8", "pique")],
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Ne doit PAS jouer le 10 car l'As est encore en jeu
      expect(action.carte).toEqual(carte("7", "carreau"));
    }
  });

  it("joue le 10 si l'As a déjà été joué (10 maîtresse)", () => {
    // L'As de carreau a été joué dans un pli précédent → le 10 est maîtresse.
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest" as PositionJoueur, carte: carte("roi", "carreau") }],
      maMain: [carte("10", "carreau"), carte("7", "carreau"), carte("8", "pique")],
      couleurAtout: "pique",
      historiquePlis: [
        {
          cartes: [
            { joueur: "est" as PositionJoueur, carte: carte("as", "carreau") },
            { joueur: "sud" as PositionJoueur, carte: carte("8", "carreau") },
            { joueur: "ouest" as PositionJoueur, carte: carte("9", "carreau") },
            { joueur: "nord" as PositionJoueur, carte: carte("dame", "carreau") },
          ],
          gagnant: "est" as PositionJoueur,
        },
      ],
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Le 10 est maintenant la plus forte → doit jouer le 10
      expect(action.carte).toEqual(carte("10", "carreau"));
    }
  });

  it("ne gaspille pas le 9 d'atout sur le valet adverse", () => {
    // L'adversaire joue le valet d'atout (carte la plus forte).
    // Le bot a le 9 d'atout (2e plus forte) + d'autres atouts.
    // Le 9 ne peut PAS battre le valet → le bot doit jouer son plus faible atout.
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "est" as PositionJoueur, carte: carte("valet", "pique") }],
      maMain: [carte("9", "pique"), carte("8", "pique"), carte("7", "coeur")],
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Ne doit PAS jouer le 9 (14 pts gaspillés) → jouer le 8
      expect(action.carte).toEqual(carte("8", "pique"));
    }
  });

  it("ne joue pas sa plus forte si elle ne peut pas battre la carte gagnante", () => {
    // Adversaire joue l'As de trefle. Le bot a le 10 et le 7 de trefle.
    // Le 10 ne bat pas l'As → jouer le 7 pour économiser le 10.
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest" as PositionJoueur, carte: carte("as", "trefle") }],
      maMain: [carte("10", "trefle"), carte("7", "trefle"), carte("8", "coeur")],
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Le 10 ne bat pas l'As → jouer le 7
      expect(action.carte).toEqual(carte("7", "trefle"));
    }
  });

  it("joue la plus petite carte gagnante (économie de force)", () => {
    // Adversaire joue le 9 de carreau. Le bot a le Roi, la Dame, le 10 de carreau.
    // Tous battent le 9. Le bot doit jouer la Dame (plus petite gagnante).
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest" as PositionJoueur, carte: carte("9", "carreau") }],
      maMain: [carte("roi", "carreau"), carte("dame", "carreau"), carte("10", "carreau")],
      couleurAtout: "pique",
      // L'As est encore en jeu → ne pas jouer le 10
      // La Dame et le Roi battent le 9, Dame est plus petite
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Dame est la plus petite carte qui bat le 9 (et protège le 10 de l'As)
      expect(action.carte).toEqual(carte("dame", "carreau"));
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
// Jeu difficile (expert) - dernier pli
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - dernier pli", () => {
  const sept_plis_vides = Array.from({ length: 7 }, () => ({
    cartes: [
      { joueur: "est" as PositionJoueur, carte: carte("7", "trefle") },
      { joueur: "sud" as PositionJoueur, carte: carte("8", "trefle") },
      { joueur: "ouest" as PositionJoueur, carte: carte("9", "trefle") },
      { joueur: "nord" as PositionJoueur, carte: carte("valet", "trefle") },
    ],
    gagnant: "nord" as PositionJoueur,
    points: 2,
  }));

  it("joue agressivement au dernier pli en entame", () => {
    const vue = creerVueJeuExpert({
      maMain: [carte("as", "carreau"), carte("7", "carreau")],
      pliEnCours: [],
      couleurAtout: "pique",
      historiquePlis: sept_plis_vides,
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      expect(action.carte).toEqual(carte("as", "carreau"));
    }
  });

  it("charge au maximum quand partenaire gagne au dernier pli", () => {
    // Bot n'a pas de coeur → peut jouer n'importe quoi
    const vue = creerVueJeuExpert({
      maMain: [carte("as", "carreau"), carte("7", "trefle")],
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("8", "coeur") },
        { joueur: "nord" as PositionJoueur, carte: carte("valet", "pique") }, // partenaire coupe
      ],
      couleurAtout: "pique",
      historiquePlis: sept_plis_vides,
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Doit charger avec l'As (11 pts) plutôt que le 7
      expect(action.carte).toEqual(carte("as", "carreau"));
    }
  });
});

// ──────────────────────────────────────────────
// Jeu difficile (expert) - adaptation au score
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - adaptation au score", () => {
  it("charge en points quand l'équipe est en difficulté et partenaire gagne", () => {
    // Après 4 plis, l'équipe n'a que 11 pts → en difficulté
    // Bot n'a pas de coeur → peut jouer n'importe quoi
    const vue = creerVueJeuExpert({
      maMain: [carte("10", "carreau"), carte("7", "trefle")],
      pliEnCours: [
        { joueur: "est" as PositionJoueur, carte: carte("8", "coeur") },
        { joueur: "nord" as PositionJoueur, carte: carte("as", "coeur") }, // partenaire gagne
      ],
      couleurAtout: "pique",
      historiquePlis: [
        // 4 plis passés, notre équipe (sud+nord) n'a gagné que 20 pts
        {
          cartes: [
            { joueur: "sud" as PositionJoueur, carte: carte("as", "trefle") },
            { joueur: "ouest" as PositionJoueur, carte: carte("7", "trefle") },
            { joueur: "nord" as PositionJoueur, carte: carte("8", "trefle") },
            { joueur: "est" as PositionJoueur, carte: carte("9", "trefle") },
          ],
          gagnant: "sud" as PositionJoueur,
          points: 11,
        },
        {
          cartes: [
            { joueur: "sud" as PositionJoueur, carte: carte("roi", "trefle") },
            { joueur: "ouest" as PositionJoueur, carte: carte("10", "trefle") },
            { joueur: "nord" as PositionJoueur, carte: carte("dame", "trefle") },
            { joueur: "est" as PositionJoueur, carte: carte("valet", "trefle") },
          ],
          gagnant: "ouest" as PositionJoueur,
          points: 17,
        },
        {
          cartes: [
            { joueur: "ouest" as PositionJoueur, carte: carte("as", "coeur") },
            { joueur: "nord" as PositionJoueur, carte: carte("7", "coeur") },
            { joueur: "est" as PositionJoueur, carte: carte("roi", "coeur") },
            { joueur: "sud" as PositionJoueur, carte: carte("dame", "coeur") },
          ],
          gagnant: "ouest" as PositionJoueur,
          points: 18,
        },
        {
          cartes: [
            { joueur: "ouest" as PositionJoueur, carte: carte("10", "coeur") },
            { joueur: "nord" as PositionJoueur, carte: carte("9", "coeur") },
            { joueur: "est" as PositionJoueur, carte: carte("dame", "carreau") },
            { joueur: "sud" as PositionJoueur, carte: carte("7", "carreau") },
          ],
          gagnant: "ouest" as PositionJoueur,
          points: 16,
        },
      ],
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Équipe en difficulté → charger avec le 10 (10 pts)
      expect(action.carte).toEqual(carte("10", "carreau"));
    }
  });
});

// ──────────────────────────────────────────────
// Jeu difficile (expert) - économie d'atout
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - économie d'atout", () => {
  it("coupe avec un petit atout plutôt que le 9 ou valet", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest" as PositionJoueur, carte: carte("roi", "carreau") }],
      maMain: [carte("9", "pique"), carte("7", "pique"), carte("8", "coeur")],
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Doit couper avec le 7 (petit atout), pas le 9 (14 pts)
      expect(action.carte).toEqual(carte("7", "pique"));
    }
  });

  it("utilise le 9 d'atout pour couper si pas d'autre atout et pli juteux", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [
        { joueur: "ouest" as PositionJoueur, carte: carte("as", "carreau") }, // 11 pts
        { joueur: "nord" as PositionJoueur, carte: carte("10", "carreau") }, // 10 pts
      ],
      maMain: [carte("9", "pique"), carte("7", "coeur")],
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Pli juteux (21 pts) et seul atout → couper avec le 9
      expect(action.carte).toEqual(carte("9", "pique"));
    }
  });
});

// ──────────────────────────────────────────────
// Jeu difficile (expert) - forcer la coupe
// ──────────────────────────────────────────────

describe("jeu difficile (expert) - forcer la coupe", () => {
  it("ne force pas la coupe si l'adversaire n'a plus d'atout", () => {
    const vue = creerVueJeuExpert({
      maMain: [carte("7", "carreau"), carte("8", "carreau"), carte("as", "coeur")],
      pliEnCours: [],
      couleurAtout: "pique",
      positionPreneur: "est",
      // Simuler : est est épuisé en carreau ET en atout (pique)
      historiquePlis: [
        {
          cartes: [
            { joueur: "sud" as PositionJoueur, carte: carte("roi", "carreau") },
            { joueur: "ouest" as PositionJoueur, carte: carte("dame", "carreau") },
            { joueur: "nord" as PositionJoueur, carte: carte("10", "carreau") },
            { joueur: "est" as PositionJoueur, carte: carte("7", "coeur") }, // est défausse → épuisé carreau
          ],
          gagnant: "nord" as PositionJoueur,
          points: 17,
        },
        {
          cartes: [
            { joueur: "nord" as PositionJoueur, carte: carte("valet", "pique") },
            { joueur: "est" as PositionJoueur, carte: carte("8", "coeur") }, // est défausse sur atout → épuisé pique
            { joueur: "sud" as PositionJoueur, carte: carte("7", "pique") },
            { joueur: "ouest" as PositionJoueur, carte: carte("8", "pique") },
          ],
          gagnant: "nord" as PositionJoueur,
          points: 22,
        },
      ],
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    if (action.type === "JOUER_CARTE") {
      // Est est épuisé en carreau ET en atout → pas d'intérêt à forcer la coupe
      // Devrait jouer l'As de coeur (carte maîtresse) plutôt que carreau
      expect(action.carte.couleur).not.toBe("carreau");
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
