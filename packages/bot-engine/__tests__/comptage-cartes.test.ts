import type { Carte, Couleur, PliComplete, PositionJoueur } from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import {
  carteEncoreEnJeu,
  cartesRestantesDeCouleur,
  compterAtoutsRestants,
  construireSuiviCartes,
  couleurEpuisee,
  estCarteMaitresse,
} from "../src/comptage-cartes";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
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
