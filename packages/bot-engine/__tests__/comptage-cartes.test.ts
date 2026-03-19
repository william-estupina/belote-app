import type {
  Carte,
  Couleur,
  PliComplete,
  PositionJoueur,
  VueBotJeu,
} from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import {
  atoutsRestantsAdversaires,
  carteEncoreEnJeu,
  carteMaitresseAvancee,
  cartesRestantesDeCouleur,
  compterAtoutsRestants,
  construireSuiviAvance,
  construireSuiviCartes,
  couleurEpuisee,
  estCarteMaitresse,
  joueurACoupe,
} from "../src/comptage-cartes";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
}

/** Crée une VueBotJeu avec un historique de plis donné */
function creerVueBotAvecHistorique(
  historiquePlis: PliComplete[],
  couleurAtout: Couleur = "pique",
): VueBotJeu {
  return {
    maMain: [carte("as", "trefle"), carte("roi", "trefle"), carte("dame", "trefle")],
    maPosition: "sud",
    positionPartenaire: "nord",
    couleurAtout,
    pliEnCours: [],
    couleurDemandee: null,
    historiquePlis,
    scoreMonEquipe: 0,
    scoreAdversaire: 0,
    phaseJeu: "jeu",
    carteRetournee: null,
    historiqueEncheres: [],
    positionPreneur: "sud",
    positionDonneur: "est",
  };
}

/** Crée une VueBotJeu sans historique */
function creerVueBotSansHistorique(): VueBotJeu {
  return creerVueBotAvecHistorique([]);
}

// ──────────────────────────────────────────────
// construireSuiviCartes
// ──────────────────────────────────────────────

describe("construireSuiviCartes", () => {
  it("sans historique, les cartes restantes = 32 - taille main", () => {
    const maMain = [carte("as", "pique"), carte("roi", "coeur"), carte("7", "trefle")];

    const suivi = construireSuiviCartes(maMain, [], []);

    expect(suivi.cartesJouees).toHaveLength(0);
    expect(suivi.cartesRestantes).toHaveLength(32 - 3);
  });

  it("retire les cartes jouées des plis de l'historique", () => {
    const maMain = [carte("as", "pique")];

    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "sud" as PositionJoueur, carte: carte("roi", "pique") },
          { joueur: "ouest" as PositionJoueur, carte: carte("dame", "pique") },
          { joueur: "nord" as PositionJoueur, carte: carte("10", "pique") },
          { joueur: "est" as PositionJoueur, carte: carte("valet", "pique") },
        ],
        gagnant: "sud" as PositionJoueur,
        points: 19,
      },
    ];

    const suivi = construireSuiviCartes(maMain, historique, []);

    expect(suivi.cartesJouees).toHaveLength(4);
    // 32 - 1 (main) - 4 (jouées) = 27
    expect(suivi.cartesRestantes).toHaveLength(27);
  });

  it("inclut les cartes du pli en cours dans les cartes jouées", () => {
    const maMain = [carte("as", "pique")];

    const pliEnCours = [
      { joueur: "est" as PositionJoueur, carte: carte("roi", "coeur") },
      { joueur: "sud" as PositionJoueur, carte: carte("dame", "coeur") },
    ];

    const suivi = construireSuiviCartes(maMain, [], pliEnCours);

    expect(suivi.cartesJouees).toHaveLength(2);
    expect(suivi.cartesRestantes).toHaveLength(32 - 1 - 2);
  });
});

// ──────────────────────────────────────────────
// compterAtoutsRestants
// ──────────────────────────────────────────────

describe("compterAtoutsRestants", () => {
  it("compte les atouts non joués et pas dans la main", () => {
    const maMain = [carte("valet", "coeur"), carte("9", "coeur")];

    // As de coeur joué
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "sud" as PositionJoueur, carte: carte("as", "coeur") },
          { joueur: "ouest" as PositionJoueur, carte: carte("7", "pique") },
          { joueur: "nord" as PositionJoueur, carte: carte("8", "pique") },
          { joueur: "est" as PositionJoueur, carte: carte("roi", "pique") },
        ],
        gagnant: "sud" as PositionJoueur,
        points: 15,
      },
    ];

    const suivi = construireSuiviCartes(maMain, historique, []);
    const restants = compterAtoutsRestants(suivi, "coeur");

    // 8 coeurs total - 2 (main) - 1 (joué) = 5
    expect(restants).toBe(5);
  });
});

// ──────────────────────────────────────────────
// carteEncoreEnJeu
// ──────────────────────────────────────────────

describe("carteEncoreEnJeu", () => {
  it("retourne true si la carte n'est pas jouée et pas dans la main", () => {
    const maMain = [carte("as", "pique")];
    const suivi = construireSuiviCartes(maMain, [], []);

    expect(carteEncoreEnJeu(suivi, "coeur", "valet")).toBe(true);
  });

  it("retourne false si la carte est dans la main du bot", () => {
    const maMain = [carte("valet", "coeur")];
    const suivi = construireSuiviCartes(maMain, [], []);

    // Le valet de coeur est dans notre main, donc pas dans cartesRestantes
    expect(carteEncoreEnJeu(suivi, "coeur", "valet")).toBe(false);
  });

  it("retourne false si la carte a été jouée", () => {
    const maMain = [carte("as", "pique")];
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "est" as PositionJoueur, carte: carte("valet", "coeur") },
          { joueur: "sud" as PositionJoueur, carte: carte("7", "pique") },
          { joueur: "ouest" as PositionJoueur, carte: carte("8", "pique") },
          { joueur: "nord" as PositionJoueur, carte: carte("9", "pique") },
        ],
        gagnant: "est" as PositionJoueur,
        points: 22,
      },
    ];

    const suivi = construireSuiviCartes(maMain, historique, []);
    expect(carteEncoreEnJeu(suivi, "coeur", "valet")).toBe(false);
  });
});

// ──────────────────────────────────────────────
// couleurEpuisee
// ──────────────────────────────────────────────

describe("couleurEpuisee", () => {
  it("retourne false si des cartes de la couleur restent", () => {
    const maMain = [carte("as", "pique")];
    const suivi = construireSuiviCartes(maMain, [], []);

    expect(couleurEpuisee(suivi, "coeur")).toBe(false);
  });

  it("retourne true quand toutes les cartes d'une couleur sont jouées ou en main", () => {
    // 8 cartes de pique : toutes jouées sauf l'As (en main)
    const maMain = [carte("as", "pique")];
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "sud" as PositionJoueur, carte: carte("roi", "pique") },
          { joueur: "ouest" as PositionJoueur, carte: carte("dame", "pique") },
          { joueur: "nord" as PositionJoueur, carte: carte("10", "pique") },
          { joueur: "est" as PositionJoueur, carte: carte("valet", "pique") },
        ],
        gagnant: "sud" as PositionJoueur,
        points: 19,
      },
      {
        cartes: [
          { joueur: "sud" as PositionJoueur, carte: carte("9", "pique") },
          { joueur: "ouest" as PositionJoueur, carte: carte("8", "pique") },
          { joueur: "nord" as PositionJoueur, carte: carte("7", "pique") },
          { joueur: "est" as PositionJoueur, carte: carte("7", "coeur") },
        ],
        gagnant: "sud" as PositionJoueur,
        points: 0,
      },
    ];

    const suivi = construireSuiviCartes(maMain, historique, []);
    expect(couleurEpuisee(suivi, "pique")).toBe(true);
  });
});

// ──────────────────────────────────────────────
// cartesRestantesDeCouleur
// ──────────────────────────────────────────────

describe("cartesRestantesDeCouleur", () => {
  it("retourne les cartes non jouées et pas en main pour une couleur", () => {
    const maMain = [carte("as", "coeur")];
    const suivi = construireSuiviCartes(maMain, [], []);

    const restantes = cartesRestantesDeCouleur(suivi, "coeur");
    // 8 coeurs - 1 (as en main) = 7
    expect(restantes).toHaveLength(7);
    expect(restantes.every((c) => c.couleur === "coeur")).toBe(true);
  });
});

// ──────────────────────────────────────────────
// estCarteMaitresse
// ──────────────────────────────────────────────

describe("estCarteMaitresse", () => {
  it("l'As hors atout est maîtresse si aucun As joué", () => {
    const maMain = [carte("as", "pique")];
    const suivi = construireSuiviCartes(maMain, [], []);

    expect(estCarteMaitresse(carte("as", "pique"), "coeur", suivi, maMain)).toBe(true);
  });

  it("le 10 hors atout est maîtresse si l'As a été joué", () => {
    const maMain = [carte("10", "pique")];
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "sud" as PositionJoueur, carte: carte("as", "pique") },
          { joueur: "ouest" as PositionJoueur, carte: carte("7", "pique") },
          { joueur: "nord" as PositionJoueur, carte: carte("8", "pique") },
          { joueur: "est" as PositionJoueur, carte: carte("9", "pique") },
        ],
        gagnant: "sud" as PositionJoueur,
        points: 11,
      },
    ];

    const suivi = construireSuiviCartes(maMain, historique, []);
    expect(estCarteMaitresse(carte("10", "pique"), "coeur", suivi, maMain)).toBe(true);
  });

  it("le 10 hors atout n'est pas maîtresse si l'As est encore en jeu", () => {
    const maMain = [carte("10", "pique")];
    const suivi = construireSuiviCartes(maMain, [], []);

    expect(estCarteMaitresse(carte("10", "pique"), "coeur", suivi, maMain)).toBe(false);
  });

  it("le Valet d'atout est toujours maîtresse", () => {
    const maMain = [carte("valet", "coeur")];
    const suivi = construireSuiviCartes(maMain, [], []);

    expect(estCarteMaitresse(carte("valet", "coeur"), "coeur", suivi, maMain)).toBe(true);
  });

  it("le 9 d'atout est maîtresse si le Valet est joué", () => {
    const maMain = [carte("9", "coeur")];
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "est" as PositionJoueur, carte: carte("valet", "coeur") },
          { joueur: "sud" as PositionJoueur, carte: carte("7", "pique") },
          { joueur: "ouest" as PositionJoueur, carte: carte("8", "trefle") },
          { joueur: "nord" as PositionJoueur, carte: carte("7", "carreau") },
        ],
        gagnant: "est" as PositionJoueur,
        points: 20,
      },
    ];

    const suivi = construireSuiviCartes(maMain, historique, []);
    expect(estCarteMaitresse(carte("9", "coeur"), "coeur", suivi, maMain)).toBe(true);
  });

  it("le 9 d'atout n'est pas maîtresse si le Valet est encore en jeu", () => {
    const maMain = [carte("9", "coeur")];
    const suivi = construireSuiviCartes(maMain, [], []);

    expect(estCarteMaitresse(carte("9", "coeur"), "coeur", suivi, maMain)).toBe(false);
  });
});

// ──────────────────────────────────────────────
// construireSuiviAvance
// ──────────────────────────────────────────────

describe("construireSuiviAvance", () => {
  it("détecte une couleur épuisée quand un joueur ne fournit pas", () => {
    // Nord joue pique sur une entame carreau → nord n'a plus de carreau
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "sud" as PositionJoueur, carte: carte("as", "carreau") },
          { joueur: "ouest" as PositionJoueur, carte: carte("roi", "carreau") },
          { joueur: "nord" as PositionJoueur, carte: carte("valet", "pique") }, // coupe !
          { joueur: "est" as PositionJoueur, carte: carte("7", "carreau") },
        ],
        gagnant: "nord" as PositionJoueur,
        points: 25,
      },
    ];

    const vue = creerVueBotAvecHistorique(historique, "pique");
    const suivi = construireSuiviAvance(vue);

    expect(suivi.couleursEpuisees["nord"]).toContain("carreau");
  });

  it("compte les atouts joués par joueur", () => {
    // Atout = pique, nord joue le 9 de pique (atout) sur une entame carreau
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "est" as PositionJoueur, carte: carte("10", "carreau") },
          { joueur: "sud" as PositionJoueur, carte: carte("dame", "carreau") },
          { joueur: "ouest" as PositionJoueur, carte: carte("8", "carreau") },
          { joueur: "nord" as PositionJoueur, carte: carte("9", "pique") }, // coupe atout
        ],
        gagnant: "nord" as PositionJoueur,
        points: 24,
      },
    ];

    const vue = creerVueBotAvecHistorique(historique, "pique");
    const suivi = construireSuiviAvance(vue);

    expect(suivi.atoutsJouesParJoueur["nord"]).toEqual([carte("9", "pique")]);
    expect(suivi.atoutsJouesParJoueur["est"]).toEqual([]);
  });

  it("retourne des tableaux vides au premier pli", () => {
    const vue = creerVueBotSansHistorique();
    const suivi = construireSuiviAvance(vue);

    expect(suivi.couleursEpuisees["sud"]).toEqual([]);
    expect(suivi.couleursEpuisees["nord"]).toEqual([]);
    expect(suivi.atoutsJouesParJoueur["sud"]).toEqual([]);
    expect(suivi.defaussesParJoueur["sud"]).toEqual([]);
  });

  it("calcule correctement au dernier pli (tout connu)", () => {
    // 7 plis complets → 28 cartes jouées, 3 en main, 1 restante
    const historique: PliComplete[] = [];
    const rangs: Carte["rang"][] = ["7", "8", "9", "10", "valet", "dame", "roi", "as"];
    // Pli 1-7 : utiliser différentes couleurs
    // Pli 1 : 4 piques
    historique.push({
      cartes: [
        { joueur: "sud" as PositionJoueur, carte: carte("7", "pique") },
        { joueur: "ouest" as PositionJoueur, carte: carte("8", "pique") },
        { joueur: "nord" as PositionJoueur, carte: carte("9", "pique") },
        { joueur: "est" as PositionJoueur, carte: carte("10", "pique") },
      ],
      gagnant: "est" as PositionJoueur,
      points: 10,
    });
    // Pli 2 : 4 piques
    historique.push({
      cartes: [
        { joueur: "est" as PositionJoueur, carte: carte("valet", "pique") },
        { joueur: "sud" as PositionJoueur, carte: carte("dame", "pique") },
        { joueur: "ouest" as PositionJoueur, carte: carte("roi", "pique") },
        { joueur: "nord" as PositionJoueur, carte: carte("as", "pique") },
      ],
      gagnant: "nord" as PositionJoueur,
      points: 17,
    });
    // Pli 3 : 4 coeurs
    historique.push({
      cartes: [
        { joueur: "nord" as PositionJoueur, carte: carte("7", "coeur") },
        { joueur: "est" as PositionJoueur, carte: carte("8", "coeur") },
        { joueur: "sud" as PositionJoueur, carte: carte("9", "coeur") },
        { joueur: "ouest" as PositionJoueur, carte: carte("10", "coeur") },
      ],
      gagnant: "ouest" as PositionJoueur,
      points: 10,
    });
    // Pli 4 : 4 coeurs
    historique.push({
      cartes: [
        { joueur: "ouest" as PositionJoueur, carte: carte("valet", "coeur") },
        { joueur: "nord" as PositionJoueur, carte: carte("dame", "coeur") },
        { joueur: "est" as PositionJoueur, carte: carte("roi", "coeur") },
        { joueur: "sud" as PositionJoueur, carte: carte("as", "coeur") },
      ],
      gagnant: "sud" as PositionJoueur,
      points: 17,
    });
    // Pli 5 : 4 carreaux
    historique.push({
      cartes: [
        { joueur: "sud" as PositionJoueur, carte: carte("7", "carreau") },
        { joueur: "ouest" as PositionJoueur, carte: carte("8", "carreau") },
        { joueur: "nord" as PositionJoueur, carte: carte("9", "carreau") },
        { joueur: "est" as PositionJoueur, carte: carte("10", "carreau") },
      ],
      gagnant: "est" as PositionJoueur,
      points: 10,
    });
    // Pli 6 : 4 carreaux
    historique.push({
      cartes: [
        { joueur: "est" as PositionJoueur, carte: carte("valet", "carreau") },
        { joueur: "sud" as PositionJoueur, carte: carte("dame", "carreau") },
        { joueur: "ouest" as PositionJoueur, carte: carte("roi", "carreau") },
        { joueur: "nord" as PositionJoueur, carte: carte("as", "carreau") },
      ],
      gagnant: "nord" as PositionJoueur,
      points: 17,
    });
    // Pli 7 : 4 trefles
    historique.push({
      cartes: [
        { joueur: "nord" as PositionJoueur, carte: carte("7", "trefle") },
        { joueur: "est" as PositionJoueur, carte: carte("8", "trefle") },
        { joueur: "sud" as PositionJoueur, carte: carte("9", "trefle") },
        { joueur: "ouest" as PositionJoueur, carte: carte("10", "trefle") },
      ],
      gagnant: "ouest" as PositionJoueur,
      points: 10,
    });

    // Main = 3 trefles restants pour le bot sud
    const vue: VueBotJeu = {
      maMain: [carte("as", "trefle"), carte("roi", "trefle"), carte("dame", "trefle")],
      maPosition: "sud",
      positionPartenaire: "nord",
      couleurAtout: "pique",
      pliEnCours: [],
      couleurDemandee: null,
      historiquePlis: historique,
      scoreMonEquipe: 0,
      scoreAdversaire: 0,
      phaseJeu: "jeu",
      carteRetournee: null,
      historiqueEncheres: [],
      positionPreneur: "sud",
      positionDonneur: "est",
    };

    const suivi = construireSuiviAvance(vue);

    // 32 - 28 jouées - 3 en main = 1 restante (valet de trefle)
    expect(suivi.cartesRestantes).toHaveLength(1);
    expect(suivi.cartesJouees).toHaveLength(28);
  });
});

// ──────────────────────────────────────────────
// joueurACoupe
// ──────────────────────────────────────────────

describe("joueurACoupe", () => {
  it("retourne true si le joueur a coupé dans une couleur", () => {
    // Nord joue pique (atout) sur entame carreau → coupe
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "est" as PositionJoueur, carte: carte("10", "carreau") },
          { joueur: "sud" as PositionJoueur, carte: carte("dame", "carreau") },
          { joueur: "ouest" as PositionJoueur, carte: carte("8", "carreau") },
          { joueur: "nord" as PositionJoueur, carte: carte("9", "pique") },
        ],
        gagnant: "nord" as PositionJoueur,
        points: 24,
      },
    ];

    const vue = creerVueBotAvecHistorique(historique, "pique");
    const suivi = construireSuiviAvance(vue);

    expect(joueurACoupe(suivi, "nord", "carreau")).toBe(true);
    expect(joueurACoupe(suivi, "est", "carreau")).toBe(false);
  });
});

// ──────────────────────────────────────────────
// atoutsRestantsAdversaires
// ──────────────────────────────────────────────

describe("atoutsRestantsAdversaires", () => {
  it("exclut les atouts du bot", () => {
    // Main avec 2 atouts pique, atout = pique
    const vue: VueBotJeu = {
      maMain: [carte("valet", "pique"), carte("9", "pique"), carte("as", "trefle")],
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
    };

    const suivi = construireSuiviAvance(vue);
    const resultat = atoutsRestantsAdversaires(suivi, vue.maMain, "nord");

    // 8 piques total - 2 en main = 6 restants (partenaire + adversaires)
    expect(resultat).toBe(6);
    expect(resultat).toBeGreaterThanOrEqual(0);
    expect(resultat).toBeLessThanOrEqual(6);
  });
});

// ──────────────────────────────────────────────
// carteMaitresseAvancee
// ──────────────────────────────────────────────

describe("carteMaitresseAvancee", () => {
  it("considère une carte maîtresse si les cartes plus fortes ont été jouées", () => {
    // As de carreau joué → 10 de carreau devrait être maîtresse
    const historique: PliComplete[] = [
      {
        cartes: [
          { joueur: "sud" as PositionJoueur, carte: carte("as", "carreau") },
          { joueur: "ouest" as PositionJoueur, carte: carte("7", "carreau") },
          { joueur: "nord" as PositionJoueur, carte: carte("8", "carreau") },
          { joueur: "est" as PositionJoueur, carte: carte("9", "carreau") },
        ],
        gagnant: "sud" as PositionJoueur,
        points: 11,
      },
    ];

    const vue = creerVueBotAvecHistorique(historique, "pique");
    const suivi = construireSuiviAvance(vue);

    expect(carteMaitresseAvancee(carte("10", "carreau"), suivi)).toBe(true);
    // Le roi n'est pas maîtresse car le 10 est encore en jeu
    expect(carteMaitresseAvancee(carte("roi", "carreau"), suivi)).toBe(false);
  });
});
